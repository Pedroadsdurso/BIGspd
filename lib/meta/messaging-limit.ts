/** Converte o tier da Meta ("TIER_250", "TIER_2K", "TIER_UNLIMITED"…) em número de destinatários/24h. */
export function parseMessagingTier(value: unknown): number | null {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const match = raw.match(/TIER_(UNLIMITED|\d+K?)/i);
  if (!match) return null;
  const tier = match[1].toUpperCase();
  if (tier === "UNLIMITED") return Infinity;
  return tier.endsWith("K") ? Number(tier.slice(0, -1)) * 1_000 : Number(tier);
}
