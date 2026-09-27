import { Worker } from "bullmq";
import { CAMPAIGN_QUEUE, type CampaignJob, isTemporaryMetaFailure } from "@/lib/queue/campaign-queue";
import { getRedis } from "@/lib/queue/connection";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { MetaApiError } from "@/lib/meta/errors";

const env = getEnv();

const worker = new Worker<CampaignJob>(CAMPAIGN_QUEUE, async (job) => {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: job.data.recipientId },
    include: { campaign: { include: { template: { include: { account: true } } } }, contact: true },
  });
  if (!recipient) return;
  if (["SENT", "DELIVERED", "READ", "CANCELLED", "SKIPPED"].includes(recipient.status)) return;
  if (["PAUSED", "CANCELLED"].includes(recipient.campaign.status)) {
    if (recipient.campaign.status === "PAUSED") {
      await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "PENDING" } });
    }
    return;
  }

  const claimed = await prisma.campaignRecipient.updateMany({
    where: { id: recipient.id, status: { in: ["PENDING", "QUEUED", "FAILED"] }, providerMessageId: null },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });
  if (!claimed.count) return;

  try {
    const client = await getMetaClientForAccount(recipient.campaign.template.account);
    const variables = recipient.renderedVariables as Record<string, string>;
    const ordered = Object.entries(variables).sort(([a], [b]) => Number(a) - Number(b)).map(([, value]) => value);
    const sent = await client.sendTemplateMessage({
      to: recipient.phone,
      templateName: recipient.campaign.template.name,
      language: recipient.campaign.language,
      bodyParameters: ordered,
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
  } catch (error) {
    const temporary = error instanceof MetaApiError && isTemporaryMetaFailure(error.httpStatus, error.code);
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "FAILED",
        failedAt: temporary && job.attemptsMade + 1 < 3 ? null : new Date(),
        errorCode: error instanceof MetaApiError ? String(error.code ?? error.httpStatus) : "WORKER_ERROR",
        errorMessage: error instanceof Error ? error.message : "Falha desconhecida",
      },
    });
    if (temporary) throw error;
  }
}, {
  connection: getRedis(),
  concurrency: env.WORKER_CONCURRENCY,
  limiter: { max: env.WORKER_MAX_PER_SECOND, duration: 1_000 },
});

worker.on("completed", (job) => log("info", "worker.job_completed", { jobId: job.id, campaignId: job.data.campaignId }));
worker.on("failed", (job, error) => log("error", "worker.job_failed", { jobId: job?.id, campaignId: job?.data.campaignId, error: error.message }));
worker.on("error", (error) => log("error", "worker.error", { error: error.message }));

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

log("info", "worker.started", { concurrency: env.WORKER_CONCURRENCY, maxPerSecond: env.WORKER_MAX_PER_SECOND });
