import IORedis from "ioredis";
import { getEnv } from "@/lib/env";

const globalRedis = globalThis as unknown as { redis?: IORedis };

export function getRedis() {
  if (!globalRedis.redis) {
    globalRedis.redis = new IORedis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return globalRedis.redis;
}
