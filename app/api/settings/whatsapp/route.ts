import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { encryptSecret } from "@/lib/security/encryption";
import { getEnv } from "@/lib/env";

const schema = z.object({
  wabaId: z.string().min(1).max(100),
  phoneNumberId: z.string().min(1).max(100),
  accessToken: z.string().min(20).optional(),
  apiVersion: z.string().regex(/^v\d+\.\d+$/),
  displayPhoneNumber: z.string().max(80).optional(),
  businessName: z.string().max(200).optional(),
});

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    const account = await prisma.whatsAppAccount.findFirst({ where: { userId: session.userId } });
    if (!account) return null;
    return {
      id: account.id, wabaId: account.wabaId, phoneNumberId: account.phoneNumberId,
      apiVersion: account.apiVersion, displayPhoneNumber: account.displayPhoneNumber,
      businessName: account.businessName, status: account.status,
      lastConnectionTestAt: account.lastConnectionTestAt,
      hasAccessToken: Boolean(account.accessTokenEncrypted || getEnv().META_ACCESS_TOKEN),
    };
  });
}

export async function PUT(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = schema.parse(await request.json());
    const env = getEnv();
    const current = await prisma.whatsAppAccount.findFirst({ where: { userId: session.userId } });
    const token = body.accessToken ? encryptSecret(body.accessToken, env.SETTINGS_ENCRYPTION_KEY) : current?.accessTokenEncrypted;
    const data = { ...body, accessTokenEncrypted: token };
    delete (data as { accessToken?: string }).accessToken;
    const account = current
      ? await prisma.whatsAppAccount.update({ where: { id: current.id }, data })
      : await prisma.whatsAppAccount.create({ data: { ...data, userId: session.userId } });
    return { id: account.id, saved: true };
  });
}
