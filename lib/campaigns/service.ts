import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isEligibleForCampaign } from "@/lib/campaigns/eligibility";
import { renderVariables } from "@/lib/campaigns/variables";
import { enqueueRecipients, isQueueEnabled } from "@/lib/queue/campaign-queue";

const RECIPIENT_CHUNK = 1_000;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

export async function prepareAndQueueCampaign(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: {
      list: { include: { members: { include: { contact: { include: { suppression: true } } } } } },
      template: true,
    },
  });
  if (!campaign) throw new Error("Campanha não encontrada");
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) throw new Error("Campanha não pode ser iniciada neste estado");
  if (campaign.template.status !== "APPROVED") throw new Error("Somente templates aprovados podem ser enviados");

  const mapping = campaign.variableMapping as Record<string, string>;
  const prepared: Array<{ contactId: string; phone: string; status: "QUEUED" | "SKIPPED"; variables: Record<string, string>; error?: string; idempotencyKey: string }> = [];
  for (const member of campaign.list.members) {
    const contact = member.contact;
    const eligibility = isEligibleForCampaign({
      phone: contact.phone,
      phoneStatus: contact.phoneStatus,
      consentStatus: contact.consentStatus,
      optOut: contact.optOut,
      suppressed: Boolean(contact.suppression),
    }, { category: campaign.category });
    const rendered = renderVariables({
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      company: contact.company,
      customFields: contact.customFields as Record<string, unknown>,
    }, mapping);
    const reasons = [...eligibility.reasons, ...(rendered.missing.length ? ["MISSING_REQUIRED_VARIABLE"] : [])];
    prepared.push({
      contactId: contact.id,
      phone: contact.phone,
      status: reasons.length ? "SKIPPED" : "QUEUED",
      variables: rendered.values,
      error: reasons.join(", ") || undefined,
      idempotencyKey: createHash("sha256").update(`${campaign.id}:${contact.id}`).digest("hex"),
    });
  }

  // Gravação em lote: upsert linha a linha numa transação interativa estoura o
  // timeout (5s) com listas grandes.
  const existing = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { id: true, contactId: true, providerMessageId: true, status: true },
  });
  const existingByContact = new Map(existing.map((row) => [row.contactId, row]));
  const queuedAt = new Date();
  const toCreate = prepared.filter((recipient) => !existingByContact.has(recipient.contactId));
  for (const batch of chunk(toCreate, RECIPIENT_CHUNK)) {
    await prisma.campaignRecipient.createMany({
      skipDuplicates: true,
      data: batch.map((recipient) => ({
        campaignId,
        contactId: recipient.contactId,
        phone: recipient.phone,
        status: recipient.status,
        renderedVariables: recipient.variables,
        idempotencyKey: recipient.idempotencyKey,
        errorCode: recipient.error ? "INELIGIBLE" : null,
        errorMessage: recipient.error,
        scheduledAt: campaign.scheduledAt,
        queuedAt: recipient.status === "QUEUED" ? queuedAt : null,
      })),
    });
  }
  // Reinício (campanha pausada): só reprepara quem ainda não foi enviado.
  for (const recipient of prepared) {
    const row = existingByContact.get(recipient.contactId);
    if (!row || row.providerMessageId || ["SENT", "DELIVERED", "READ", "CANCELLED"].includes(row.status)) continue;
    await prisma.campaignRecipient.update({
      where: { id: row.id },
      data: {
        status: recipient.status,
        renderedVariables: recipient.variables,
        errorCode: recipient.error ? "INELIGIBLE" : null,
        errorMessage: recipient.error,
        queuedAt: recipient.status === "QUEUED" ? queuedAt : null,
      },
    });
  }
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: campaign.scheduledAt && campaign.scheduledAt > new Date() ? "SCHEDULED" : "QUEUED" },
  });

  const queuedCount = await prisma.campaignRecipient.count({ where: { campaignId, status: "QUEUED" } });
  if (isQueueEnabled()) {
    const queued = await prisma.campaignRecipient.findMany({ where: { campaignId, status: "QUEUED" } });
    await enqueueRecipients(queued.map((recipient) => ({
      recipientId: recipient.id,
      campaignId,
      idempotencyKey: recipient.idempotencyKey,
      scheduledAt: recipient.scheduledAt,
    })));
  }
  return { total: prepared.length, queued: queuedCount, skipped: prepared.length - queuedCount };
}

export async function pauseCampaign(id: string, userId: string) {
  return prisma.campaign.update({ where: { id, userId }, data: { status: "PAUSED", pausedAt: new Date() } });
}

export async function resumeCampaign(id: string, userId: string) {
  const campaign = await prisma.campaign.update({ where: { id, userId }, data: { status: "QUEUED", pausedAt: null } });
  // Destinatários devolvidos para PENDING durante a pausa voltam para a fila.
  await prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: "PENDING" }, data: { status: "QUEUED" } });
  const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId: id, status: { in: ["PENDING", "QUEUED"] } } });
  await enqueueRecipients(recipients.map((recipient) => ({ recipientId: recipient.id, campaignId: id, idempotencyKey: recipient.idempotencyKey, scheduledAt: recipient.scheduledAt })));
  return campaign;
}

/** Recoloca na fila as falhas que podem dar certo depois (limite, instabilidade), menos número inválido. */
const PERMANENT_FAILURE_CODES = ["131026", "INELIGIBLE"];

export async function retryFailedRecipients(id: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({ where: { id, userId } });
  if (!campaign) throw new Error("Campanha não encontrada");
  if (campaign.status === "CANCELLED") throw new Error("Campanha cancelada não pode reenviar");
  const { count } = await prisma.campaignRecipient.updateMany({
    where: { campaignId: id, status: "FAILED", OR: [{ errorCode: null }, { errorCode: { notIn: PERMANENT_FAILURE_CODES } }] },
    data: { status: "QUEUED", providerMessageId: null, failedAt: null, attempts: 0, errorCode: null, errorMessage: null, queuedAt: new Date() },
  });
  if (count && ["COMPLETED", "FAILED"].includes(campaign.status)) {
    await prisma.campaign.update({ where: { id }, data: { status: "QUEUED", finishedAt: null } });
  }
  return { requeued: count };
}

export async function cancelCampaign(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.campaignRecipient.updateMany({
      where: { campaignId: id, status: { in: ["PENDING", "QUEUED", "PROCESSING"] } },
      data: { status: "CANCELLED", errorCode: "CAMPAIGN_CANCELLED", errorMessage: "Campanha cancelada antes do envio" },
    });
    return tx.campaign.update({ where: { id, userId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });
}
