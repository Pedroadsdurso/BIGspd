import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/contacts/phone";
import { assertSameOrigin } from "@/lib/security/request";

export async function GET() {
  return withApi(async () => { await requireApiUser(); return prisma.suppressionEntry.findMany({ include: { contact: true }, orderBy: { createdAt: "desc" } }); });
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = z.object({ phone: z.string(), reason: z.string().min(1).max(500) }).parse(await request.json());
    const phone = normalizePhone(body.phone);
    if (phone.status !== "VALID") return Response.json({ error: "Telefone inválido" }, { status: 400 });
    const contact = await prisma.contact.findUnique({ where: { userId_phone: { userId: session.userId, phone: phone.phone } } });
    if (contact) await prisma.contact.update({ where: { id: contact.id }, data: { optOut: true, optOutAt: new Date(), consentStatus: "OPTED_OUT" } });
    return prisma.suppressionEntry.upsert({ where: { phone: phone.phone }, create: { phone: phone.phone, contactId: contact?.id, reason: body.reason, source: "manual" }, update: { contactId: contact?.id, reason: body.reason, source: "manual" } });
  });
}
