import "server-only";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/encryption";

export async function getWebhookSecrets() {
  const env = getEnv();
  let appSecret = env.META_WEBHOOK_APP_SECRET || env.META_APP_SECRET;
  let verifyToken = env.META_WEBHOOK_VERIFY_TOKEN;

  if (!appSecret || !verifyToken) {
    const account = await prisma.whatsAppAccount.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { appSecretEncrypted: true, verifyTokenEncrypted: true },
    });
    if (!appSecret && account?.appSecretEncrypted) {
      appSecret = decryptSecret(account.appSecretEncrypted, env.SETTINGS_ENCRYPTION_KEY);
    }
    if (!verifyToken && account?.verifyTokenEncrypted) {
      verifyToken = decryptSecret(account.verifyTokenEncrypted, env.SETTINGS_ENCRYPTION_KEY);
    }
  }

  return { appSecret: appSecret || "", verifyToken: verifyToken || "" };
}
