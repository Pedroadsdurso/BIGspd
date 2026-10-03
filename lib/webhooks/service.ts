import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extractWebhookEvents, isOptOutText } from "@/lib/webhooks/parser";
import { normalizePhone } from "@/lib/contacts/phone";
import { Prisma } from "@/lib/generated/prisma/client";
import { runAutoReply } from "@/lib/automations/service";
import { toTemplateStatus } from "@/lib/meta/templates";

const statusMap = {
  sent: "SENT",
  delivered: "DELIVERED",
  read: "READ",
  failed: "FAILED",
} as const;

const inboundTypeMap: Record<string, "TEXT" | "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO" | "INTERACTIVE"> = {
  text: "TEXT",
  image: "IMAGE",
  sticker: "IMAGE",
  document: "DOCUMENT",
  audio: "AUDIO",
  voice: "AUDIO",
  video: "VIDEO",
  interactive: "INTERACTIVE",
  button: "INTERACTIVE",
};

export async function persistAndProcessWebhook(rawBody: string, signatureValid: boolean) {
  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const eventKey = createHash("sha256").update(rawBody).digest("hex");
  const event = await prisma.webhookEvent.upsert({
    where: { eventKey },
    create: { eventKey, objectType: String(payload.object ?? "unknown"), payload: payload as Prisma.InputJsonValue, signatureValid },
    update: {},
  });
  if (event.processedAt) return { duplicate: true };

  try {
    const { statuses, messages, contacts, templateStatuses } = extractWebhookEvents(payload);
    for (const update of templateStatuses) {
      const status = toTemplateStatus(update.event);
      if (status === "UNKNOWN") continue;
      const byProvider = update.message_template_id != null ? { providerId: String(update.message_template_id) } : undefined;
      const byName = update.message_template_name && update.message_template_language
        ? { name: update.message_template_name, language: update.message_template_language }
        : undefined;
      if (!byProvider && !byName) continue;
      await prisma.template.updateMany({
        where: { OR: [byProvider, byName].filter((clause) => clause !== undefined) },
        data: { status, lastSyncedAt: new Date() },
      });
    }
    for (const status of statuses) {
      const mapped = statusMap[status.status];
      const timestamp = status.timestamp ? new Date(Number(status.timestamp) * 1_000) : new Date();
      const error = status.errors?.[0];
      const timeData = mapped === "SENT" ? { sentAt: timestamp }
        : mapped === "DELIVERED" ? { deliveredAt: timestamp }
        : mapped === "READ" ? { readAt: timestamp }
        : { failedAt: timestamp };
      await prisma.$transaction([
        prisma.message.updateMany({
          where: { providerMessageId: status.id },
          data: { status: mapped, ...timeData, errorCode: error?.code ? String(error.code) : null, errorMessage: error?.message || error?.title || error?.error_data?.details },
        }),
        prisma.campaignRecipient.updateMany({
          where: { providerMessageId: status.id },
          data: { status: mapped, ...timeData, errorCode: error?.code ? String(error.code) : null, errorMessage: error?.message || error?.title || error?.error_data?.details },
        }),
      ]);
    }

    for (const incoming of messages) {
      const phone = normalizePhone(incoming.from, "55");
      if (phone.status !== "VALID") continue;
      const profile = contacts.find((contact) => contact.wa_id === incoming.from)?.profile?.name;
      const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (!owner) continue;
      const contact = await prisma.contact.upsert({
        where: { userId_phone: { userId: owner.id, phone: phone.phone } },
        create: { userId: owner.id, phone: phone.phone, name: profile || phone.phone, phoneStatus: "VALID" },
        update: profile ? { name: profile } : {},
      });
      const existing = await prisma.message.findUnique({ where: { providerMessageId: incoming.id } });
      if (!existing) {
        await prisma.message.create({
          data: {
            contactId: contact.id,
            providerMessageId: incoming.id,
            direction: "INBOUND",
            type: inboundTypeMap[incoming.type] ?? "UNKNOWN",
            status: "DELIVERED",
            content: incoming as Prisma.InputJsonValue,
            deliveredAt: incoming.timestamp ? new Date(Number(incoming.timestamp) * 1_000) : new Date(),
          },
        });
      }
      const text = incoming.text?.body;
      const optingOut = Boolean(text && isOptOutText(text));
      if (optingOut) {
        await prisma.$transaction([
          prisma.contact.update({ where: { id: contact.id }, data: { optOut: true, optOutAt: new Date(), consentStatus: "OPTED_OUT" } }),
          prisma.suppressionEntry.upsert({
            where: { phone: contact.phone },
            create: { contactId: contact.id, phone: contact.phone, reason: `Solicitação recebida: ${text}`, source: "whatsapp_inbound" },
            update: { contactId: contact.id, reason: `Solicitação recebida: ${text}`, source: "whatsapp_inbound" },
          }),
          prisma.consentAuditLog.create({ data: { contactId: contact.id, newStatus: "OPTED_OUT", previousStatus: contact.consentStatus, source: "whatsapp_inbound", evidence: `Mensagem de opt-out recebida (${incoming.id})` } }),
        ]);
      }
      if (!existing && !optingOut) await runAutoReply(owner.id, contact, incoming);
    }
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return { duplicate: false, statuses: statuses.length, messages: messages.length, templates: templateStatuses.length };
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processingError: error instanceof Error ? error.message : String(error) } });
    throw error;
  }
}
