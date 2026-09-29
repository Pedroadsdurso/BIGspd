import "server-only";
import { prisma } from "@/lib/prisma";

const ID_CHUNK = 10_000;
const AUDIT_CHUNK = 5_000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Marks contacts as OPTED_IN in bulk and records a consent audit log for each
// transition. Never overrides an explicit opt-out and skips contacts already
// opted in, so re-running is a no-op. Scope to a list with listId, otherwise the
// whole base.
export async function bulkGrantConsent(input: {
  userId: string;
  listId?: string;
  source?: string;
  evidence?: string;
}) {
  const source = input.source?.trim() || "manual";
  const evidence = input.evidence?.trim() || "Consentimento concedido em massa pelo responsável";

  const targets = await prisma.contact.findMany({
    where: {
      userId: input.userId,
      consentStatus: { not: "OPTED_IN" },
      optOut: false,
      ...(input.listId ? { listMemberships: { some: { listId: input.listId } } } : {}),
    },
    select: { id: true, consentStatus: true },
  });

  if (!targets.length) return { updated: 0 };

  const now = new Date();
  const ids = targets.map((contact) => contact.id);

  await prisma.$transaction(
    async (tx) => {
      for (const batch of chunk(ids, ID_CHUNK)) {
        await tx.contact.updateMany({
          where: { id: { in: batch } },
          data: {
            consentStatus: "OPTED_IN",
            optInAt: now,
            optInSource: source,
            optInMethod: "bulk",
            optOut: false,
            optOutAt: null,
          },
        });
      }

      const logs = targets.map((contact) => ({
        contactId: contact.id,
        previousStatus: contact.consentStatus,
        newStatus: "OPTED_IN" as const,
        source,
        method: "bulk",
        evidence,
      }));
      for (const batch of chunk(logs, AUDIT_CHUNK)) {
        await tx.consentAuditLog.createMany({ data: batch });
      }
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  return { updated: targets.length };
}
