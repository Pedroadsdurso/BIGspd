import { getEnv } from "@/lib/env";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let originValue: string;
  try {
    originValue = new URL(origin).origin;
  } catch {
    throw new Error("INVALID_ORIGIN");
  }

  const allowed = new Set<string>();

  // Configured app origin (if any).
  try {
    allowed.add(new URL(getEnv().APP_URL).origin);
  } catch {
    /* ignore malformed APP_URL */
  }

  // The host actually serving this request. Behind Vercel's proxy the public
  // domain arrives via x-forwarded-*; this makes login work on localhost,
  // preview deployments, and production without pinning APP_URL to one domain.
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) allowed.add(`${forwardedProto}://${forwardedHost}`);
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }

  if (!allowed.has(originValue)) throw new Error("INVALID_ORIGIN");
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count) };
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
