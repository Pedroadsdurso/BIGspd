import "server-only";
import { prisma } from "@/lib/prisma";
import type { MappedContact } from "@/lib/contacts/importer";

export async function commitImport(input: {
  userId: string;
  fileName: string;
  delimiter: string;
  mapping: Record<string, string>;
  contacts: MappedContact[];
  listId?: string;
}) {
  const valid = input.contacts.filter((contact) => !contact.error && contact.phone);
  const phones = valid.map((contact) => contact.phone!);
  const existing = await prisma.contact.findMany({
    where: { userId: input.userId, phone: { in: phones } },
    select: { id: true, phone: true },
  });
  const existingMap = new Map(existing.map((contact) => [contact.phone, contact.id]));
  let importedRows = 0;
  let existingRows = 0;

  const result = await prisma.$transaction(async (tx) => {
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

    for (const contact of valid) {
      if (!contact.phone) continue;
      let contactId = existingMap.get(contact.phone);
      if (contactId) {
        existingRows += 1;
      } else {
        const created = await tx.contact.create({
          data: {
            userId: input.userId,
            name: contact.name,
            phone: contact.phone,
            phoneStatus: contact.phoneStatus,
            email: contact.email,
            company: contact.company,
            customFields: contact.customFields,
            consentStatus: contact.consentStatus,
            optInAt: contact.consentStatus === "OPTED_IN" ? contact.optInAt : null,
            optInSource: contact.consentStatus === "OPTED_IN" ? contact.optInSource : null,
            optOut: contact.consentStatus === "OPTED_OUT",
            optOutAt: contact.consentStatus === "OPTED_OUT" ? new Date() : null,
            consentAuditLogs: contact.consentStatus !== "UNKNOWN" ? {
              create: {
                newStatus: contact.consentStatus,
                source: contact.optInSource || "import",
                evidence: "Consentimento fornecido no arquivo importado",
              },
            } : undefined,
          },
        });
        contactId = created.id;
        importedRows += 1;
      }
      if (input.listId) {
        await tx.contactListMember.upsert({
          where: { listId_contactId: { listId: input.listId, contactId } },
          create: { listId: input.listId, contactId },
          update: {},
        });
      }
    }

    return tx.importJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        importedRows,
        existingRows,
        duplicateRows: input.contacts.filter((contact) => contact.error === "Duplicado no arquivo").length,
        invalidRows: input.contacts.filter((contact) => contact.phoneStatus === "INVALID_PHONE").length,
        completedAt: new Date(),
        report: {
          errors: input.contacts.filter((contact) => contact.error).slice(0, 500),
        },
      },
    });
  });
  return result;
}
