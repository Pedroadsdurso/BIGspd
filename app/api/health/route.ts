import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/queue/connection";

export async function GET() {
  const checks = { database: false, redis: false };
  try { await prisma.$queryRaw`SELECT 1`; checks.database = true; } catch {}
  try { if (getRedis().status === "wait") await getRedis().connect(); checks.redis = (await getRedis().ping()) === "PONG"; } catch {}
  const ok = checks.database && checks.redis;
  return Response.json({ ok, checks, timestamp: new Date().toISOString() }, { status: ok ? 200 : 503 });
}
