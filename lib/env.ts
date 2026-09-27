import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32),
  OWNER_EMAIL: z.string().email(),
  OWNER_PASSWORD_HASH: z.string().min(20),
  SETTINGS_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "SETTINGS_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64.",
    }),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  META_WABA_ID: z.string().optional(),
  META_PHONE_NUMBER_ID: z.string().optional(),
  META_API_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v25.0"),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_WEBHOOK_APP_SECRET: z.string().optional(),
  META_CLIENT_MODE: z.enum(["live", "mock"]).default("mock"),
  DEFAULT_COUNTRY_CODE: z.string().regex(/^\d{1,3}$/).default("55"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  WORKER_MAX_PER_SECOND: z.coerce.number().int().min(1).max(1000).default(5),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}

export function resetEnvForTests() {
  cached = undefined;
}
