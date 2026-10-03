import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { log } from "@/lib/logger";

const WINDOW_MS = 24 * 60 * 60 * 1_000;
const CACHE_MS = 15 * 60 * 1_000;
/** Sem resposta da Meta, assume o menor tier para não estourar o limite. */
const FALLBACK_LIMIT = 250;

export type LimitSource = "env" | "meta" | "fallback";
let cached: { limit: number; source: LimitSource; at: number } | undefined;

/** Limite diário: META_DAILY_LIMIT (override manual) ou o tier lido da Meta, com cache de 15 min. */
export async function getDailyLimit(): Promise<{ limit: number; source: LimitSource }> {
  const override = getEnv().META_DAILY_LIMIT;
  if (override) return { limit: override, source: "env" };
  if (cached && Date.now() - cached.at < CACHE_MS) return cached;
  try {
    const account = await prisma.whatsAppAccount.findFirst({ orderBy: { createdAt: "asc" } });
    const detected = await (await getMetaClientForAccount(account)).getMessagingLimit();
    cached = detected === null
      ? { limit: FALLBACK_LIMIT, source: "fallback", at: Date.now() }
      : { limit: detected, source: "meta", at: Date.now() };
    if (detected === null) log("warn", "limits.tier_not_reported", { fallback: FALLBACK_LIMIT });
  } catch (error) {
    log("warn", "limits.tier_lookup_failed", { error: error instanceof Error ? error.message : String(error) });
    // Mantém o último valor conhecido se houver; senão, o conservador.
    cached = { limit: cached?.limit ?? FALLBACK_LIMIT, source: cached?.source ?? "fallback", at: Date.now() };
  }
  return cached;
}

/** Destinatários únicos que receberam template na janela móvel de 24h e quando a próxima vaga abre. */
export async function getSendWindowUsage() {
  const since = new Date(Date.now() - WINDOW_MS);
  const rows = await prisma.campaignRecipient.findMany({
    where: { sentAt: { gte: since }, providerMessageId: { not: null } },
    distinct: ["phone"],
    select: { phone: true, sentAt: true },
    orderBy: [{ phone: "asc" }, { sentAt: "asc" }],
  });
  const oldest = rows.reduce<Date | null>((min, row) => (row.sentAt && (!min || row.sentAt < min) ? row.sentAt : min), null);
  return { used: rows.length, nextSlotAt: oldest ? new Date(oldest.getTime() + WINDOW_MS) : null };
}

export async function getDailyLimitStatus() {
  const [{ limit, source }, { used, nextSlotAt }] = await Promise.all([getDailyLimit(), getSendWindowUsage()]);
  const remaining = Math.max(0, limit - used);
  return { limit, source, used, remaining, reached: remaining === 0, resumesAt: remaining === 0 ? nextSlotAt : null };
}
