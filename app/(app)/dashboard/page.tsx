import { Activity, ContactRound, Eye, Megaphone, MessageCircleCheck, MessageSquareText, ShieldBan, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageChart } from "@/components/dashboard/message-chart";
import { StatusBadge } from "@/components/data/status-badge";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await requireUser();
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const [contacts, campaigns, optOuts, messages, delivered, read, failed, recent, recentMessages] = await prisma.$transaction([
    prisma.contact.count({ where: { userId } }), prisma.campaign.count({ where: { userId } }), prisma.contact.count({ where: { userId, optOut: true } }),
    prisma.message.count({ where: { contact: { userId }, direction: "OUTBOUND" } }), prisma.message.count({ where: { contact: { userId }, status: { in: ["DELIVERED", "READ"] } } }),
    prisma.message.count({ where: { contact: { userId }, status: "READ" } }), prisma.message.count({ where: { contact: { userId }, status: "FAILED" } }),
    prisma.campaign.findMany({ where: { userId }, include: { list: true, _count: { select: { recipients: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.message.findMany({ where: { contact: { userId }, direction: "OUTBOUND", createdAt: { gte: weekStart } }, select: { createdAt: true, status: true } }),
  ]);
  const today = new Date();
  const chart = Array.from({ length: 7 }, (_, offset) => { const date = new Date(today); date.setDate(date.getDate() - (6 - offset)); const key = date.toISOString().slice(0, 10); const rows = recentMessages.filter((message) => message.createdAt.toISOString().slice(0, 10) === key); return { day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date), sent: rows.length, delivered: rows.filter((row) => ["DELIVERED", "READ"].includes(row.status)).length, read: rows.filter((row) => row.status === "READ").length, failed: rows.filter((row) => row.status === "FAILED").length }; });
  const stats = [
    ["Contatos", contacts, ContactRound], ["Campanhas", campaigns, Megaphone], ["Enviadas", messages, MessageSquareText], ["Entregues", delivered, MessageCircleCheck], ["Lidas", read, Eye], ["Falhas", failed, TriangleAlert], ["Opt-outs", optOuts, ShieldBan],
  ] as const;
  return <><PageHeader eyebrow="Visão operacional" title="Dashboard" description="Acompanhe o fluxo entre contatos elegíveis, fila, Meta Cloud API e webhooks." />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon]) => <Card key={label} className="shadow-none"><CardContent className="flex items-center justify-between p-4"><div><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-bold">{value.toLocaleString("pt-BR")}</p></div><span className="rounded-xl bg-[var(--surface-muted)] p-2.5 text-[var(--primary)]"><Icon className="h-5 w-5" /></span></CardContent></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><Card><CardHeader><CardTitle>Mensagens nos últimos 7 dias</CardTitle><CardDescription>Estados confirmados pelos eventos recebidos da Meta.</CardDescription></CardHeader><CardContent><MessageChart data={chart} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Pipeline de entrega</CardTitle><CardDescription>Importar não autoriza o envio. A elegibilidade é avaliada antes da fila.</CardDescription></CardHeader><CardContent><div className="space-y-3">{["Contato importado", "Consentimento verificado", "Fila BullMQ", "Cloud API oficial", "Status via webhook"].map((step, index) => <div key={step} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border bg-[var(--surface-muted)] text-xs font-bold">{index + 1}</span><span className="text-sm font-medium">{step}</span>{index === 4 && <Activity className="ml-auto h-4 w-4 text-[var(--primary)]" />}</div>)}</div></CardContent></Card></div>
    <Card className="mt-6"><CardHeader><CardTitle>Campanhas recentes</CardTitle></CardHeader><CardContent className="p-0">{recent.length ? <Table><THead><tr><TH>Campanha</TH><TH>Lista</TH><TH>Status</TH><TH>Destinatários</TH><TH>Criada</TH></tr></THead><TBody>{recent.map((campaign) => <tr key={campaign.id}><TD className="font-medium">{campaign.name}</TD><TD>{campaign.list.name}</TD><TD><StatusBadge status={campaign.status} /></TD><TD>{campaign._count.recipients}</TD><TD>{formatDate(campaign.createdAt)}</TD></tr>)}</TBody></Table> : <div className="p-8 text-center text-sm text-[var(--muted)]">Nenhuma campanha criada.</div>}</CardContent></Card>
  </>;
}
