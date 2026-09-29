import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { bulkGrantConsent } from "@/lib/contacts/consent";
import { assertSameOrigin } from "@/lib/security/request";

const schema = z.object({
  listId: z.string().optional(),
  source: z.string().max(160).optional(),
  evidence: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = schema.parse(await request.json().catch(() => ({})));

    if (body.listId) {
      const list = await prisma.contactList.findFirst({ where: { id: body.listId, userId: session.userId } });
      if (!list) return Response.json({ error: "Lista não encontrada" }, { status: 404 });
    }

    return bulkGrantConsent({
      userId: session.userId,
      listId: body.listId,
      source: body.source,
      evidence: body.evidence,
    });
  });
}
