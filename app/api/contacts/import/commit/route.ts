import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { parseImportFile, type SupportedDelimiter } from "@/lib/contacts/parser";
import { mapImportRows } from "@/lib/contacts/importer";
import { commitImport } from "@/lib/contacts/service";
import { assertSameOrigin } from "@/lib/security/request";

const schema = z.object({
  fileName: z.string().min(1).max(255),
  content: z.string().min(1).max(10_000_000),
  delimiter: z.enum([",", ";", "|", "\t"]),
  mapping: z.record(z.string(), z.string()),
  listId: z.string().optional(),
  defaultCountryCode: z.string().regex(/^\d{1,3}$/).default("55"),
});

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = schema.parse(await request.json());
    const parsed = parseImportFile(body.content, body.delimiter as SupportedDelimiter);
    const mapped = mapImportRows(parsed.headers, parsed.rows, body.mapping, body.defaultCountryCode);
    const job = await commitImport({
      userId: session.userId,
      fileName: body.fileName,
      delimiter: body.delimiter,
      mapping: body.mapping,
      contacts: mapped.contacts,
      listId: body.listId,
    });
    return Response.json(job, { status: 201 });
  });
}
