import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";

// Adds every contact the user owns to the list in a single INSERT ... SELECT,
// skipping contacts already in the list. Scales to any contact count without
// loading ids into the app or hitting the 1000-id cap of the per-id endpoint.
export async function POST(request: Request, context: RouteContext<"/api/lists/[id]/members/all">) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const { id } = await context.params;
    const list = await prisma.contactList.findFirst({ where: { id, userId: session.userId } });
    if (!list) return Response.json({ error: "Lista não encontrada" }, { status: 404 });

    const added = await prisma.$executeRaw`
      INSERT INTO contact_list_members (list_id, contact_id)
      SELECT ${id}, c.id FROM contacts c
      WHERE c.user_id = ${session.userId}
      ON CONFLICT (list_id, contact_id) DO NOTHING
    `;

    return { added };
  });
}
