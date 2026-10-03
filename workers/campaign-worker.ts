import { Worker } from "bullmq";
import { CAMPAIGN_QUEUE, type CampaignJob } from "@/lib/queue/campaign-queue";
import { getRedis } from "@/lib/queue/connection";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { sendCampaignRecipient } from "@/lib/campaigns/dispatcher";

const env = getEnv();

const worker = new Worker<CampaignJob>(CAMPAIGN_QUEUE, async (job) => {
  const { outcome, error } = await sendCampaignRecipient(job.data.recipientId);
  // Falha temporária: relança para o BullMQ aplicar o backoff.
  if (outcome === "retry") throw error;
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
