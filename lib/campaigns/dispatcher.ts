import { prisma } from "@/lib/prisma";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { MetaApiError } from "@/lib/meta/errors";
import { buildTemplateComponents } from "@/lib/meta/template-params";
import { isTemporaryMetaFailure } from "@/lib/queue/campaign-queue";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";

export const MAX_SEND_ATTEMPTS = 3;

export type SendOutcome = "sent" | "skipped" | "failed" | "retry";

/** Envia um destinatário. Idempotente: só quem conseguir "reivindicar" a linha envia. */
export async function sendCampaignRecipient(recipientId: string): Promise<{ outcome: SendOutcome; error?: unknown }> {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: { campaign: { include: { template: { include: { account: true } } } }, contact: true },
  });
  if (!recipient) return { outcome: "skipped" };
  if (["SENT", "DELIVERED", "READ", "CANCELLED", "SKIPPED"].includes(recipient.status)) return { outcome: "skipped" };
  if (["PAUSED", "CANCELLED"].includes(recipient.campaign.status)) {
    if (recipient.campaign.status === "PAUSED") {
      await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "PENDING" } });
    }
    return { outcome: "skipped" };
  }

  const claimed = await prisma.campaignRecipient.updateMany({
    where: { id: recipient.id, status: { in: ["PENDING", "QUEUED", "FAILED"] }, providerMessageId: null },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  if (!claimed.count) return { outcome: "skipped" };
  const attempt = recipient.attempts + 1;

  try {
    const client = await getMetaClientForAccount(recipient.campaign.template.account);
    const variables = recipient.renderedVariables as Record<string, string>;
    const sent = await client.sendTemplateMessage({
      to: recipient.phone,
      templateName: recipient.campaign.template.name,
      language: recipient.campaign.language,
      components: buildTemplateComponents(recipient.campaign.template.components, variables),
    });
    const now = new Date();
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", providerMessageId: sent.messageId, sentAt: now, errorCode: null, errorMessage: null },
      }),
      prisma.message.create({
        data: {
          campaignId: recipient.campaignId,
          campaignRecipientId: recipient.id,
          contactId: recipient.contactId,
          providerMessageId: sent.messageId,
          direction: "OUTBOUND",
          type: "TEMPLATE",
          status: "SENT",
          content: { template: recipient.campaign.template.name, language: recipient.campaign.language, variables },
          sentAt: now,
        },
      }),
      prisma.campaign.update({ where: { id: recipient.campaignId }, data: { status: "RUNNING", startedAt: recipient.campaign.startedAt ?? now } }),
    ]);
    return { outcome: "sent" };
  } catch (error) {
    const temporary = error instanceof MetaApiError && isTemporaryMetaFailure(error.httpStatus, error.code);
    const willRetry = temporary && attempt < MAX_SEND_ATTEMPTS;
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "FAILED",
        failedAt: willRetry ? null : new Date(),
        errorCode: error instanceof MetaApiError ? String(error.code ?? error.httpStatus) : "WORKER_ERROR",
        errorMessage: error instanceof Error ? error.message : "Falha desconhecida",
      },
    });
    return { outcome: willRetry ? "retry" : "failed", error };
  }
}

/** Marca como COMPLETED as campanhas sem destinatários pendentes. */
async function completeFinishedCampaigns(campaignIds: string[]) {
  for (const campaignId of new Set(campaignIds)) {
    const pending = await prisma.campaignRecipient.count({
      where: {
        campaignId,
        OR: [
          { status: { in: ["PENDING", "QUEUED", "PROCESSING"] } },
          { status: "FAILED", failedAt: null, attempts: { lt: MAX_SEND_ATTEMPTS } },
        ],
      },
    });
    if (!pending) {
      await prisma.campaign.updateMany({
        where: { id: campaignId, status: { in: ["QUEUED", "RUNNING", "SCHEDULED"] } },
        data: { status: "COMPLETED", finishedAt: new Date() },
      });
    }
  }
}

/**
 * Envia destinatários vencidos direto do banco (sem Redis/worker), respeitando
 * WORKER_MAX_PER_SECOND e parando antes de `deadlineMs` para caber no maxDuration.
 */
export async function dispatchDueRecipients(options: { campaignId?: string; deadlineMs: number }) {
  const env = getEnv();
  const minIntervalMs = Math.ceil(1_000 / env.WORKER_MAX_PER_SECOND);
  const counts: Record<SendOutcome, number> = { sent: 0, skipped: 0, failed: 0, retry: 0 };
  const touched: string[] = [];
  const attempted = new Set<string>();

  while (Date.now() < options.deadlineMs) {
    const now = new Date();
    const batch = await prisma.campaignRecipient.findMany({
      where: {
        ...(options.campaignId ? { campaignId: options.campaignId } : {}),
        id: { notIn: [...attempted] },
        providerMessageId: null,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        AND: [{
          OR: [
            { status: "QUEUED" },
            { status: "FAILED", failedAt: null, attempts: { lt: MAX_SEND_ATTEMPTS } },
          ],
        }],
        campaign: { status: { in: ["QUEUED", "RUNNING", "SCHEDULED"] } },
      },
      select: { id: true, campaignId: true },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
    if (!batch.length) break;

    for (const { id, campaignId } of batch) {
      if (Date.now() >= options.deadlineMs) break;
      attempted.add(id);
      touched.push(campaignId);
      const startedAt = Date.now();
      const { outcome, error } = await sendCampaignRecipient(id);
      counts[outcome] += 1;
      if (error) log("warn", "dispatch.send_failed", { recipientId: id, campaignId, outcome, error: error instanceof Error ? error.message : String(error) });
      const elapsed = Date.now() - startedAt;
      if (elapsed < minIntervalMs) await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
    }
  }

  await completeFinishedCampaigns(touched);
  log("info", "dispatch.finished", { campaignId: options.campaignId, ...counts });
  return counts;
}
