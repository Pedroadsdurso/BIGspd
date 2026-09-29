import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { autoReplyRuleSchema } from "@/lib/automations/schema";

export async function PATCH(request: Request, context: RouteContext<"/api/automations/[id]">) { return withApi(async () => { assertSameOrigin(request); const session = await requireApiUser(); const { id } = await context.params; const exists = await prisma.autoReplyRule.findFirst({ where: { id, userId: session.userId } }); if (!exists) return Response.json({ error: "Automação não encontrada" }, { status: 404 }); const body = autoReplyRuleSchema.partial().parse(await request.json()); return prisma.autoReplyRule.update({ where: { id }, data: body }); }); }
export async function DELETE(request: Request, context: RouteContext<"/api/automations/[id]">) { return withApi(async () => { assertSameOrigin(request); const session = await requireApiUser(); const { id } = await context.params; const exists = await prisma.autoReplyRule.findFirst({ where: { id, userId: session.userId } }); if (!exists) return Response.json({ error: "Automação não encontrada" }, { status: 404 }); await prisma.autoReplyRule.delete({ where: { id } }); return { deleted: true }; }); }
