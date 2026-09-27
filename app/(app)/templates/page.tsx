import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { SyncTemplatesButton } from "@/components/forms/simple-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/data/empty-state";
export const dynamic = "force-dynamic";
export default async function TemplatesPage() { const { userId } = await requireUser(); const templates = await prisma.template.findMany({ where: { account: { userId } }, orderBy: [{ name: "asc" }, { language: "asc" }] }); return <><PageHeader eyebrow="Conteúdo aprovado" title="Templates" description="Somente templates disponíveis e aprovados pela Meta podem ser selecionados." actions={<SyncTemplatesButton />} /><Card><CardContent className="p-0">{templates.length ? <Table><THead><tr><TH>Nome</TH><TH>Idioma</TH><TH>Categoria</TH><TH>Status</TH><TH>Variáveis</TH></tr></THead><TBody>{templates.map((template) => <tr key={template.id}><TD className="font-semibold">{template.name}</TD><TD>{template.language}</TD><TD>{template.category}</TD><TD><StatusBadge status={template.status} /></TD><TD>{Array.isArray(template.variables) ? template.variables.join(", ") || "—" : "—"}</TD></tr>)}</TBody></Table> : <EmptyState title="Nenhum template sincronizado" description="Configure o WhatsApp e sincronize os templates da WABA." />}</CardContent></Card></>; }
