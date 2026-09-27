import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isEligibleForCampaign } from "@/lib/campaigns/eligibility";
import { renderVariables } from "@/lib/campaigns/variables";
import { enqueueRecipients } from "@/lib/queue/campaign-queue";

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

  await prisma.$transaction(async (tx) => {
    for (const recipient of prepared) {
      await tx.campaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId, contactId: recipient.contactId } },
        create: {
          campaignId,
          contactId: recipient.contactId,
          phone: recipient.phone,
          status: recipient.status,
          renderedVariables: recipient.variables,
          idempotencyKey: recipient.idempotencyKey,
          errorCode: recipient.error ? "INELIGIBLE" : null,
          errorMessage: recipient.error,
          scheduledAt: campaign.scheduledAt,
          queuedAt: recipient.status === "QUEUED" ? new Date() : null,
        },
        update: {
          status: recipient.status,
          renderedVariables: recipient.variables,
          errorCode: recipient.error ? "INELIGIBLE" : null,
          errorMessage: recipient.error,
          queuedAt: recipient.status === "QUEUED" ? new Date() : null,
        },
      });
    }
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        status: campaign.scheduledAt && campaign.scheduledAt > new Date() ? "SCHEDULED" : "QUEUED",
      },
    });
  });

  const queued = await prisma.campaignRecipient.findMany({ where: { campaignId, status: "QUEUED" } });
  await enqueueRecipients(queued.map((recipient) => ({
    recipientId: recipient.id,
    campaignId,
    idempotencyKey: recipient.idempotencyKey,
    scheduledAt: recipient.scheduledAt,
  })));
  return { total: prepared.length, queued: queued.length, skipped: prepared.length - queued.length };
}

export async function pauseCampaign(id: string, userId: string) {
  return prisma.campaign.update({ where: { id, userId }, data: { status: "PAUSED", pausedAt: new Date() } });
}

export async function resumeCampaign(id: string, userId: string) {
  const campaign = await prisma.campaign.update({ where: { id, userId }, data: { status: "QUEUED", pausedAt: null } });
  const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId: id, status: { in: ["PENDING", "QUEUED"] } } });
  await enqueueRecipients(recipients.map((recipient) => ({ recipientId: recipient.id, campaignId: id, idempotencyKey: recipient.idempotencyKey, scheduledAt: recipient.scheduledAt })));
  return campaign;
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
