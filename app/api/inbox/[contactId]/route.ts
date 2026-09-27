import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { assertSameOrigin } from "@/lib/security/request";

export async function GET(_: Request, context: RouteContext<"/api/inbox/[contactId]">) { return withApi(async () => { const session = await requireApiUser(); const { contactId } = await context.params; const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: session.userId }, include: { messages: { orderBy: { createdAt: "asc" }, take: 500 } } }); return contact ? contact : Response.json({ error: "Contato não encontrado" }, { status: 404 }); }); }
export async function POST(request: Request, context: RouteContext<"/api/inbox/[contactId]">) { return withApi(async () => {
  assertSameOrigin(request); const session = await requireApiUser(); const { contactId } = await context.params; const body = z.object({ text: z.string().min(1).max(4096) }).parse(await request.json());
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: session.userId }, include: { messages: { where: { direction: "INBOUND" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!contact) return Response.json({ error: "Contato não encontrado" }, { status: 404 });
  const lastInbound = contact.messages[0]?.createdAt; const withinWindow = lastInbound && Date.now() - lastInbound.getTime() <= 24 * 60 * 60 * 1000;
  if (!withinWindow) return Response.json({ error: "Janela de atendimento encerrada. Use um template aprovado." }, { status: 409 });
  const account = await prisma.whatsAppAccount.findFirst({ where: { userId: session.userId } }); const sent = await (await getMetaClientForAccount(account)).sendTextMessage({ to: contact.phone, text: body.text });
  const message = await prisma.message.create({ data: { contactId, providerMessageId: sent.messageId, direction: "OUTBOUND", type: "TEXT", status: "SENT", content: { text: { body: body.text } }, sentAt: new Date() } }); return Response.json(message, { status: 201 });
}); }
