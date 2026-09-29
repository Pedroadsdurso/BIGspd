import "server-only";
import { prisma } from "@/lib/prisma";
import type { MappedContact } from "@/lib/contacts/importer";

// Postgres caps a single statement at 65535 bind parameters. Contact rows carry
// ~13 columns, so we chunk well under that to keep every INSERT valid and to
// avoid a multi-thousand-row statement blowing the transaction/function budget.
const CONTACT_CHUNK = 1000;
const JOIN_CHUNK = 5000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function commitImport(input: {
  userId: string;
  fileName: string;
  delimiter: string;
  mapping: Record<string, string>;
  contacts: MappedContact[];
  listId?: string;
}) {
  const valid = input.contacts.filter((contact) => !contact.error && contact.phone) as Array<
    MappedContact & { phone: string }
  >;
  const phones = valid.map((contact) => contact.phone);

  const existing = phones.length
    ? await prisma.contact.findMany({
        where: { userId: input.userId, phone: { in: phones } },
        select: { phone: true },
      })
    : [];
  const existingPhones = new Set(existing.map((contact) => contact.phone));
  const toCreate = valid.filter((contact) => !existingPhones.has(contact.phone));

  const duplicateRows = input.contacts.filter((contact) => contact.error === "Duplicado no arquivo").length;
  const invalidRows = input.contacts.filter((contact) => contact.phoneStatus === "INVALID_PHONE").length;

  const result = await prisma.$transaction(
    async (tx) => {
      const job = await tx.importJob.create({
        data: {
          userId: input.userId,
          listId: input.listId,
          fileName: input.fileName,
          delimiter: input.delimiter,
          mapping: input.mapping,
          status: "PROCESSING",
          totalRows: input.contacts.length,
        },
      });

      // Bulk-insert new contacts in chunks. skipDuplicates guards against a race
      // with a concurrent import creating the same (userId, phone).
      let importedRows = 0;
      for (const batch of chunk(toCreate, CONTACT_CHUNK)) {
        const created = await tx.contact.createMany({
          skipDuplicates: true,
          data: batch.map((contact) => ({
            userId: input.userId,
            name: contact.name,
            phone: contact.phone,
            phoneStatus: contact.phoneStatus,
            email: contact.email,
            company: contact.company,
            customFields: contact.customFields,
            consentStatus: contact.consentStatus,
            optInAt: contact.consentStatus === "OPTED_IN" ? contact.optInAt ?? null : null,
            optInSource: contact.consentStatus === "OPTED_IN" ? contact.optInSource ?? null : null,
            optOut: contact.consentStatus === "OPTED_OUT",
            optOutAt: contact.consentStatus === "OPTED_OUT" ? new Date() : null,
          })),
        });
        importedRows += created.count;
      }

      // Resolve ids for every valid phone (new + pre-existing) for audit logs and
      // list membership.
      const phoneToId = new Map<string, string>();
      for (const batch of chunk(phones, JOIN_CHUNK)) {
        const rows = await tx.contact.findMany({
          where: { userId: input.userId, phone: { in: batch } },
          select: { id: true, phone: true },
        });
        for (const row of rows) phoneToId.set(row.phone, row.id);
      }

      // Consent audit trail only for freshly imported contacts that carried a
      // known consent value in the file.
      const auditLogs = toCreate
        .filter((contact) => contact.consentStatus !== "UNKNOWN" && phoneToId.has(contact.phone))
        .map((contact) => ({
          contactId: phoneToId.get(contact.phone)!,
          newStatus: contact.consentStatus,
          source: contact.optInSource || "import",
          evidence: "Consentimento fornecido no arquivo importado",
        }));
      for (const batch of chunk(auditLogs, JOIN_CHUNK)) {
        await tx.consentAuditLog.createMany({ data: batch });
      }

      let existingRows = 0;
      if (input.listId) {
        const memberships = valid
          .filter((contact) => phoneToId.has(contact.phone))
          .map((contact) => ({ listId: input.listId!, contactId: phoneToId.get(contact.phone)! }));
        for (const batch of chunk(memberships, JOIN_CHUNK)) {
          await tx.contactListMember.createMany({ skipDuplicates: true, data: batch });
        }
      }
      existingRows = valid.length - importedRows;

      return tx.importJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          importedRows,
          existingRows,
          duplicateRows,
          invalidRows,
          completedAt: new Date(),
          report: {
            errors: input.contacts.filter((contact) => contact.error).slice(0, 500),
          },
        },
      });
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  return result;
}
