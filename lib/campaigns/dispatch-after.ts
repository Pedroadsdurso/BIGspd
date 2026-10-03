import "server-only";
import { dispatchDueRecipients } from "@/lib/campaigns/dispatcher";
import { isQueueEnabled } from "@/lib/queue/campaign-queue";
import { log } from "@/lib/logger";

/**
 * Cada execução envia por até 50s: o cron roda a cada minuto, então as
 * execuções não se sobrepõem (sobreposição multiplicava conexões no banco).
 */
export const DISPATCH_BUDGET_MS = 50_000;

/** Roda dentro de after(): com worker/Redis ativo não faz nada; sem ele, envia direto. */
export async function dispatchAfterResponse(campaignId: string) {
  if (isQueueEnabled()) return;
  try {
    await dispatchDueRecipients({ campaignId, deadlineMs: Date.now() + DISPATCH_BUDGET_MS });
  } catch (error) {
    log("error", "dispatch.after_failed", { campaignId, error: error instanceof Error ? error.message : String(error) });
  }
}
