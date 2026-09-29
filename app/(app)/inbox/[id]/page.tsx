import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ReplyForm } from "@/components/forms/reply-form";
import { formatDate } from "@/lib/utils";
import { messagePreview } from "@/lib/messages/preview";
import { isWithinServiceWindow } from "@/lib/campaigns/service-window";
export const dynamic = "force-dynamic";
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) { const { userId } = await requireUser(); const contact = await prisma.contact.findFirst({ where: { id: (await params).id, userId }, include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } } }); if (!contact) notFound(); const lastInbound = [...contact.messages].reverse().find((message) => message.direction === "INBOUND"); const enabled = isWithinServiceWindow(lastInbound?.createdAt); return <><PageHeader eyebrow="Conversa" title={contact.name} description={contact.phone} /><Card><CardContent className="space-y-3 p-5">{contact.messages.map((message) => { return <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${message.direction === "OUTBOUND" ? "bg-[var(--primary)] text-[#04100b]" : "bg-[var(--surface-muted)]"}`}><p className="whitespace-pre-wrap">{messagePreview(message.content, message.type)}</p><p className="mt-1 text-[11px] opacity-65">{message.autoReplyRuleId ? "Automação · " : ""}{formatDate(message.createdAt)} · {message.status}{message.errorMessage ? ` · ${message.errorMessage}` : ""}</p></div></div>; })}<div className="border-t pt-4"><ReplyForm contactId={contact.id} enabled={enabled} /></div></CardContent></Card></>; }
