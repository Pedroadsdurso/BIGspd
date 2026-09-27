import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WhatsAppSettingsForm } from "@/components/forms/whatsapp-settings-form";
export const dynamic = "force-dynamic";
export default async function WhatsAppSettingsPage() { const { userId } = await requireUser(); const env = getEnv(); const account = await prisma.whatsAppAccount.findFirst({ where: { userId } }); const safe = account ? { wabaId: account.wabaId, phoneNumberId: account.phoneNumberId, apiVersion: account.apiVersion, displayPhoneNumber: account.displayPhoneNumber, businessName: account.businessName, status: account.status, hasAccessToken: Boolean(account.accessTokenEncrypted || env.META_ACCESS_TOKEN), hasAppSecret: Boolean(account.appSecretEncrypted || env.META_WEBHOOK_APP_SECRET || env.META_APP_SECRET), hasWebhookVerifyToken: Boolean(account.verifyTokenEncrypted || env.META_WEBHOOK_VERIFY_TOKEN) } : null; return <><PageHeader eyebrow="Integração oficial" title="WhatsApp Cloud API" description="Configure diretamente a WABA, o número e o webhook da Meta. Nenhum gateway intermediário é usado." /><Card><CardHeader><CardTitle>Credenciais da conta</CardTitle><CardDescription>Segredos são cifrados no servidor e nunca retornam ao navegador.</CardDescription></CardHeader><CardContent><WhatsAppSettingsForm account={safe} mode={env.META_CLIENT_MODE} /></CardContent></Card></>; }
