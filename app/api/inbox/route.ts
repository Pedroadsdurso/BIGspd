import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    const contacts = await prisma.contact.findMany({
      where: { userId: session.userId, messages: { some: {} } },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return contacts;
  });
}
