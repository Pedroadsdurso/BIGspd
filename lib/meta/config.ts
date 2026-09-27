import "server-only";
import type { WhatsAppAccount } from "@/lib/generated/prisma/client";
import { getEnv } from "@/lib/env";
import { decryptSecret } from "@/lib/security/encryption";
import { CloudApiMetaWhatsAppClient } from "@/lib/meta/client";
import { MockMetaWhatsAppClient } from "@/lib/meta/mock-client";
import type { MetaWhatsAppClient } from "@/lib/meta/types";

export async function getMetaClientForAccount(account?: WhatsAppAccount | null): Promise<MetaWhatsAppClient> {
  const env = getEnv();
  if (env.META_CLIENT_MODE === "mock") return new MockMetaWhatsAppClient();
  const accessToken = account?.accessTokenEncrypted
    ? decryptSecret(account.accessTokenEncrypted, env.SETTINGS_ENCRYPTION_KEY)
    : env.META_ACCESS_TOKEN;
  const wabaId = account?.wabaId || env.META_WABA_ID;
  const phoneNumberId = account?.phoneNumberId || env.META_PHONE_NUMBER_ID;
  const apiVersion = account?.apiVersion || env.META_API_VERSION;
  if (!accessToken || !wabaId || !phoneNumberId) throw new Error("Configuração Meta incompleta.");
  return new CloudApiMetaWhatsAppClient({ accessToken, wabaId, phoneNumberId, apiVersion });
}
