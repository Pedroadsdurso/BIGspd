import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { EmptyState } from "@/components/data/empty-state";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function CampaignsPage() { const { userId } = await requireUser(); const campaigns = await prisma.campaign.findMany({ where: { userId }, include: { list: true, template: true, _count: { select: { recipients: true } } }, orderBy: { createdAt: "desc" } }); return <><PageHeader eyebrow="Mensageria" title="Campanhas" description="Crie campanhas com templates aprovados e fila controlada." actions={<Button asChild><Link href="/campaigns/new"><Plus className="h-4 w-4" />Nova campanha</Link></Button>} /><Card><CardContent className="p-0">{campaigns.length ? <Table><THead><tr><TH>Nome</TH><TH>Lista</TH><TH>Template</TH><TH>Status</TH><TH>Destinatários</TH><TH>Agendada</TH></tr></THead><TBody>{campaigns.map((campaign) => <tr key={campaign.id}><TD><Link className="font-semibold hover:text-[var(--primary)]" href={`/campaigns/${campaign.id}`}>{campaign.name}</Link></TD><TD>{campaign.list.name}</TD><TD>{campaign.template.name}</TD><TD><StatusBadge status={campaign.status} /></TD><TD>{campaign._count.recipients}</TD><TD>{formatDate(campaign.scheduledAt)}</TD></tr>)}</TBody></Table> : <EmptyState title="Nenhuma campanha" description="Sincronize templates, crie uma lista e monte a primeira campanha." />}</CardContent></Card></>; }
