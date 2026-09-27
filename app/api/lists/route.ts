import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";

const schema = z.object({ name: z.string().min(1).max(160), description: z.string().max(500).optional(), tags: z.array(z.string()).default([]) });

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    return prisma.contactList.findMany({ where: { userId: session.userId }, include: { _count: { select: { members: true, campaigns: true } } }, orderBy: { createdAt: "desc" } });
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = schema.parse(await request.json());
    return Response.json(await prisma.contactList.create({ data: { ...body, userId: session.userId } }), { status: 201 });
  });
}
