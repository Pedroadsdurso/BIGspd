import { Queue } from "bullmq";
import { getRedis } from "@/lib/queue/connection";

export const CAMPAIGN_QUEUE = "whatsapp-campaign-messages";
let queue: Queue | undefined;

export type CampaignJob = { recipientId: string; campaignId: string; idempotencyKey: string };

export function getCampaignQueue() {
  if (!queue) queue = new Queue<CampaignJob>(CAMPAIGN_QUEUE, { connection: getRedis() });
  return queue;
}

/** BullMQ só é usado quando há Redis configurado; sem ele o envio sai pelo dispatcher (after() + cron). */
export function isQueueEnabled() {
  return Boolean(process.env.REDIS_URL);
}

export async function enqueueRecipients(recipients: Array<CampaignJob & { scheduledAt?: Date | null }>) {
  if (!recipients.length || !isQueueEnabled()) return;
  const now = Date.now();
  await getCampaignQueue().addBulk(recipients.map((recipient) => ({
    name: "send-template",
    data: { recipientId: recipient.recipientId, campaignId: recipient.campaignId, idempotencyKey: recipient.idempotencyKey },
    opts: {
      jobId: recipient.idempotencyKey,
      delay: Math.max(0, (recipient.scheduledAt?.getTime() ?? now) - now),
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 10_000 },
      removeOnFail: { age: 604_800, count: 20_000 },
    },
  })));
}

export function isTemporaryMetaFailure(status: number, code?: number) {
  return status === 408 || status === 429 || status >= 500 || [1, 2, 4, 17, 341, 80007].includes(code ?? -1);
}
