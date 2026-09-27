import { normalizePhone } from "@/lib/contacts/phone";

export type ColumnMapping = Record<string, string>;

export type MappedContact = {
  sourceRow: number;
  name: string;
  phone: string | null;
  phoneStatus: "VALID" | "INVALID_PHONE";
  email?: string;
  company?: string;
  consentStatus: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  optInAt?: Date;
  optInSource?: string;
  customFields: Record<string, string>;
  error?: string;
};

function consentFrom(value: string | undefined): MappedContact["consentStatus"] {
  if (!value) return "UNKNOWN";
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "sim", "yes", "opted_in", "consentido"].includes(normalized)) return "OPTED_IN";
  if (["false", "0", "não", "nao", "no", "opted_out", "recusado"].includes(normalized)) return "OPTED_OUT";
  return "UNKNOWN";
}

export function mapImportRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  defaultCountryCode = "55",
) {
  const contacts: MappedContact[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let invalid = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const source = Object.fromEntries(headers.map((header, index) => [header, rows[rowIndex][index]?.trim() ?? ""]));
    const target: Record<string, string> = {};
    const customFields: Record<string, string> = {};
    for (const [header, destination] of Object.entries(mapping)) {
      const value = source[header];
      if (!value || destination === "ignore") continue;
      if (destination.startsWith("custom.")) customFields[destination.slice(7)] = value;
      else target[destination] = value;
    }

    const normalized = normalizePhone(target.phone, defaultCountryCode);
    let error: string | undefined;
    if (normalized.status === "INVALID_PHONE") {
      invalid += 1;
      error = "Telefone ausente ou inválido";
    } else if (seen.has(normalized.phone)) {
      duplicates += 1;
      error = "Duplicado no arquivo";
    } else {
      seen.add(normalized.phone);
    }

    contacts.push({
      sourceRow: rowIndex + 1,
      name: target.name || "Sem nome",
      phone: normalized.status === "VALID" ? normalized.phone : null,
      phoneStatus: normalized.status,
      email: target.email || undefined,
      company: target.company || undefined,
      consentStatus: consentFrom(target.consent),
      optInAt: target.optInAt && !Number.isNaN(Date.parse(target.optInAt)) ? new Date(target.optInAt) : undefined,
      optInSource: target.optInSource || undefined,
      customFields,
      error,
    });
  }
  return { contacts, duplicates, invalid };
}
