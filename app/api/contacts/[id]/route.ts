import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { Prisma } from "@/lib/generated/prisma/client";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(), email: z.string().email().nullable().optional(), company: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(60)).optional(), customFields: z.record(z.string(), z.unknown()).optional(),
  consentStatus: z.enum(["UNKNOWN", "OPTED_IN", "OPTED_OUT"]).optional(), optInSource: z.string().max(200).optional(),
  optInMethod: z.string().max(100).optional(), optInCategory: z.string().max(100).optional(), optInEvidence: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, context: RouteContext<"/api/contacts/[id]">) {
  return withApi(async () => {
    assertSameOrigin(request); const session = await requireApiUser(); const { id } = await context.params; const body = updateSchema.parse(await request.json());
    const current = await prisma.contact.findFirst({ where: { id, userId: session.userId } });
    if (!current) return Response.json({ error: "Contato não encontrado" }, { status: 404 });
    const changedConsent = body.consentStatus && body.consentStatus !== current.consentStatus;
    const contact = await prisma.$transaction(async (tx) => {
      const updated = await tx.contact.update({ where: { id }, data: {
        name: body.name, email: body.email, company: body.company, tags: body.tags,
        customFields: body.customFields as Prisma.InputJsonValue | undefined,
        consentStatus: body.consentStatus, optInAt: body.consentStatus === "OPTED_IN" ? new Date() : undefined,
        optInSource: body.optInSource, optInMethod: body.optInMethod, optInCategory: body.optInCategory, optInEvidence: body.optInEvidence,
        optOut: body.consentStatus === "OPTED_OUT" ? true : body.consentStatus === "OPTED_IN" ? false : undefined,
        optOutAt: body.consentStatus === "OPTED_OUT" ? new Date() : body.consentStatus === "OPTED_IN" ? null : undefined,
      } });
      if (changedConsent) await tx.consentAuditLog.create({ data: { contactId: id, previousStatus: current.consentStatus, newStatus: body.consentStatus!, source: body.optInSource || "manual", method: body.optInMethod, category: body.optInCategory, evidence: body.optInEvidence } });
      return updated;
    });
    return contact;
  });
}
