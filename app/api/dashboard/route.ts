import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    const [contacts, campaigns, messages, optOuts, statusGroups] = await prisma.$transaction([
      prisma.contact.count({ where: { userId: session.userId } }),
      prisma.campaign.count({ where: { userId: session.userId } }),
      prisma.message.count({ where: { contact: { userId: session.userId }, direction: "OUTBOUND" } }),
      prisma.contact.count({ where: { userId: session.userId, optOut: true } }),
      prisma.message.groupBy({ by: ["status"], where: { contact: { userId: session.userId }, direction: "OUTBOUND" }, orderBy: { status: "asc" }, _count: true }),
    ]);
    const statuses = Object.fromEntries(statusGroups.map((group) => [group.status, group._count]));
    return { contacts, campaigns, messages, optOuts, delivered: statuses.DELIVERED ?? 0, read: statuses.READ ?? 0, failed: statuses.FAILED ?? 0 };
  });
}
