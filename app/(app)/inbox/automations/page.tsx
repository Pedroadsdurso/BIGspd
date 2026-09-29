import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AutoReplyForm } from "@/components/forms/auto-reply-form";
export const dynamic = "force-dynamic";
export default async function AutomationsPage() { const { userId } = await requireUser(); const rules = await prisma.autoReplyRule.findMany({ where: { userId }, include: { _count: { select: { messages: true } } }, orderBy: { createdAt: "asc" } }); return <><PageHeader eyebrow="Inbox" title="Automações" description="Respostas automáticas enviadas quando a mensagem do lead (texto ou botão do template) bate com uma palavra-chave. A primeira regra ativa que corresponder é usada." actions={<Button asChild variant="secondary"><Link href="/inbox">← Voltar para Inbox</Link></Button>} /><Card className="mb-6"><CardHeader><CardTitle>Nova automação</CardTitle><CardDescription>Ex.: palavra-chave igual ao texto do botão &quot;Falar com atendente&quot; do seu template.</CardDescription></CardHeader><CardContent><AutoReplyForm /></CardContent></Card><div className="space-y-4">{rules.map((rule) => <Card key={rule.id}><CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>{rule.name}</CardTitle><div className="flex gap-2"><Badge tone={rule.active ? "success" : "neutral"}>{rule.active ? "Ativa" : "Pausada"}</Badge><Badge>{rule._count.messages} envios</Badge></div></CardHeader><CardContent><AutoReplyForm rule={{ id: rule.id, name: rule.name, keywords: rule.keywords, matchType: rule.matchType, replyText: rule.replyText, active: rule.active, cooldownMinutes: rule.cooldownMinutes }} /></CardContent></Card>)}</div></>; }
