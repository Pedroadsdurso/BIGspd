import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { parseImportFile, suggestMapping, type SupportedDelimiter } from "@/lib/contacts/parser";
import { mapImportRows } from "@/lib/contacts/importer";
import { assertSameOrigin } from "@/lib/security/request";

const bodySchema = z.object({
  content: z.string().min(1).max(10_000_000),
  delimiter: z.enum([",", ";", "|", "\t"]).optional(),
  mapping: z.record(z.string(), z.string()).optional(),
  defaultCountryCode: z.string().regex(/^\d{1,3}$/).default("55"),
});

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    await requireApiUser();
    const body = bodySchema.parse(await request.json());
    const parsed = parseImportFile(body.content, body.delimiter as SupportedDelimiter | undefined);
    const mapping = body.mapping ?? suggestMapping(parsed.headers);
    const result = mapImportRows(parsed.headers, parsed.rows, mapping, body.defaultCountryCode);
    return {
      delimiter: parsed.delimiter === "\t" ? "TAB" : parsed.delimiter,
      rawDelimiter: parsed.delimiter,
      headers: parsed.headers,
      hasHeader: parsed.hasHeader,
      mapping,
      total: result.contacts.length,
      valid: result.contacts.filter((contact) => !contact.error).length,
      duplicates: result.duplicates,
      invalid: result.invalid,
      preview: result.contacts.slice(0, 20),
    };
  });
}
