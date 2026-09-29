import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { autoReplyRuleSchema } from "@/lib/automations/schema";

export async function GET() {
  return withApi(async () => { const session = await requireApiUser(); return prisma.autoReplyRule.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "asc" } }); });
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = autoReplyRuleSchema.parse(await request.json());
    return Response.json(await prisma.autoReplyRule.create({ data: { ...body, userId: session.userId } }), { status: 201 });
  });
}
