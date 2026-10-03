import "server-only";
import { dispatchDueRecipients } from "@/lib/campaigns/dispatcher";
import { isQueueEnabled } from "@/lib/queue/campaign-queue";
import { log } from "@/lib/logger";

/** Folga para terminar antes do maxDuration (300s) da função. */
export const DISPATCH_BUDGET_MS = 270_000;

/** Roda dentro de after(): com worker/Redis ativo não faz nada; sem ele, envia direto. */
export async function dispatchAfterResponse(campaignId: string) {
  if (isQueueEnabled()) return;
  try {
    await dispatchDueRecipients({ campaignId, deadlineMs: Date.now() + DISPATCH_BUDGET_MS });
  } catch (error) {
    log("error", "dispatch.after_failed", { campaignId, error: error instanceof Error ? error.message : String(error) });
  }
}
