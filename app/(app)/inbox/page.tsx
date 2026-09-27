import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function InboxPage() { const { userId } = await requireUser(); const contacts = await prisma.contact.findMany({ where: { userId, messages: { some: {} } }, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" }, take: 100 }); return <><PageHeader eyebrow="Conversas" title="Inbox" description="Respostas recebidas pelos webhooks oficiais da Meta." /><Card><CardContent className="p-0">{contacts.length ? <div className="divide-y">{contacts.map((contact) => { const message = contact.messages[0]; const content = message?.content as { text?: { body?: string }; template?: string }; return <Link href={`/inbox/${contact.id}`} key={contact.id} className="grid gap-2 p-4 transition hover:bg-[var(--surface-muted)] sm:grid-cols-[1fr_1.6fr_auto] sm:items-center"><div><p className="font-semibold">{contact.name}</p><p className="text-sm text-[var(--muted)]">{contact.phone}</p></div><p className="truncate text-sm">{content?.text?.body || (content?.template ? `Template: ${content.template}` : message?.type)}</p><div className="text-right"><StatusBadge status={message?.status || "UNKNOWN"} /><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(message?.createdAt)}</p></div></Link>; })}</div> : <EmptyState title="Inbox vazia" description="As mensagens recebidas aparecerão aqui após a configuração do webhook." />}</CardContent></Card></>; }
