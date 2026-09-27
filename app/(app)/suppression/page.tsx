import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AddSuppressionForm } from "@/components/forms/simple-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/data/empty-state";
import { formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function SuppressionPage() { await requireUser(); const entries = await prisma.suppressionEntry.findMany({ include: { contact: true }, orderBy: { createdAt: "desc" } }); return <><PageHeader eyebrow="Segurança de envio" title="Suppression list" description="Números suprimidos nunca entram automaticamente na fila de campanhas." /><Card className="mb-6"><CardHeader><CardTitle>Adicionar número</CardTitle></CardHeader><CardContent><AddSuppressionForm /></CardContent></Card><Card><CardContent className="p-0">{entries.length ? <Table><THead><tr><TH>Contato</TH><TH>Telefone</TH><TH>Motivo</TH><TH>Origem</TH><TH>Data</TH></tr></THead><TBody>{entries.map((entry) => <tr key={entry.id}><TD>{entry.contact?.name || "—"}</TD><TD>{entry.phone}</TD><TD>{entry.reason}</TD><TD>{entry.source}</TD><TD>{formatDate(entry.createdAt)}</TD></tr>)}</TBody></Table> : <EmptyState title="Nenhum número suprimido" description="Solicitações de opt-out recebidas pelo WhatsApp aparecem automaticamente aqui." />}</CardContent></Card></>; }
