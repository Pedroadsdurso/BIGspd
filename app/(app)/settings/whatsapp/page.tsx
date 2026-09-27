import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WhatsAppSettingsForm } from "@/components/forms/whatsapp-settings-form";
export const dynamic = "force-dynamic";
export default async function WhatsAppSettingsPage() { const { userId } = await requireUser(); const account = await prisma.whatsAppAccount.findFirst({ where: { userId } }); const safe = account ? { wabaId: account.wabaId, phoneNumberId: account.phoneNumberId, apiVersion: account.apiVersion, displayPhoneNumber: account.displayPhoneNumber, businessName: account.businessName, status: account.status, hasAccessToken: Boolean(account.accessTokenEncrypted || getEnv().META_ACCESS_TOKEN) } : null; return <><PageHeader eyebrow="Integração oficial" title="WhatsApp Cloud API" description="Configure diretamente a WABA e o número da Meta. Nenhum gateway intermediário é usado." /><Card><CardHeader><CardTitle>Credenciais da conta</CardTitle><CardDescription>O modo mock permite validar o fluxo local sem simular uma conexão real com a Meta.</CardDescription></CardHeader><CardContent><WhatsAppSettingsForm account={safe} mode={getEnv().META_CLIENT_MODE} /></CardContent></Card></>; }
