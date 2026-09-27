import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    return prisma.template.findMany({ where: { account: { userId: session.userId } }, orderBy: [{ name: "asc" }, { language: "asc" }] });
  });
}
