import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignForm } from "@/components/forms/campaign-form";
export const dynamic = "force-dynamic";
export default async function NewCampaignPage() { const { userId } = await requireUser(); const [lists, templates] = await Promise.all([prisma.contactList.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.template.findMany({ where: { account: { userId }, status: "APPROVED" }, select: { id: true, name: true, language: true, category: true, variables: true }, orderBy: { name: "asc" } })]); return <div className="mx-auto max-w-3xl"><PageHeader eyebrow="Nova campanha" title="Configurar envio" description="A campanha somente entra na fila após a revisão de elegibilidade." /><CampaignForm lists={lists} templates={templates} /></div>; }
