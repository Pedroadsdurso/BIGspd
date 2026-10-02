import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { MetaApiError, recommendedMetaAction } from "@/lib/meta/errors";
import { syncTemplates } from "@/lib/meta/templates";
import { assertSameOrigin } from "@/lib/security/request";
import { log } from "@/lib/logger";

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const account = await prisma.whatsAppAccount.findFirst({ where: { userId: session.userId } });
    try {
      const result = await (await getMetaClientForAccount(account)).testConnection();
      if (account) await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: "CONNECTED", lastConnectionTestAt: new Date(), lastError: null, businessName: result.businessName, displayPhoneNumber: result.displayPhoneNumber } });
      // Conexão OK: puxa os templates da WABA no mesmo passo para não deixar a lista vazia.
      let templatesSynced: number | null = null;
      try {
        ({ synced: templatesSynced } = await syncTemplates(session.userId));
      } catch (syncError) {
        log("warn", "whatsapp.test.template_sync_failed", { error: syncError instanceof Error ? syncError.message : String(syncError) });
      }
      return { ...result, templatesSynced };
    } catch (error) {
      if (account) await prisma.whatsAppAccount.update({ where: { id: account.id }, data: { status: "ERROR", lastConnectionTestAt: new Date(), lastError: error instanceof Error ? error.message : "Falha" } });
      if (error instanceof MetaApiError) {
        return Response.json({ error: error.message, code: error.code, action: recommendedMetaAction(error) }, { status: error.httpStatus });
      }
      throw error;
    }
  });
}
