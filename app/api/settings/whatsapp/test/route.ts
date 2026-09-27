import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { MetaApiError, recommendedMetaAction } from "@/lib/meta/errors";
import { assertSameOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const account = await prisma.whatsAppAccount.findFirst({ where: { userId: session.userId } });
    try {
      const result = await (await getMetaClientForAccount(account)).testConnection();
      if (account) await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: "CONNECTED", lastConnectionTestAt: new Date(), lastError: null, businessName: result.businessName, displayPhoneNumber: result.displayPhoneNumber } });
      return result;
    } catch (error) {
      if (account) await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: "ERROR", lastConnectionTestAt: new Date(), lastError: error instanceof Error ? error.message : "Falha" } });
      if (error instanceof MetaApiError) {
        return Response.json({ error: error.message, code: error.code, action: recommendedMetaAction(error) }, { status: error.httpStatus });
      }
      throw error;
    }
  });
}
