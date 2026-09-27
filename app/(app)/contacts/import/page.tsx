import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ImportWizard } from "@/components/forms/import-wizard";
export const dynamic = "force-dynamic";
export default async function ImportPage() { const { userId } = await requireUser(); const lists = await prisma.contactList.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }); return <><PageHeader eyebrow="Importação profissional" title="Importar contatos" description="Detecte, mapeie e valide o arquivo sem pressupor consentimento." /><ImportWizard lists={lists} /></>; }
