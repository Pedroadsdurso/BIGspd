export const SUPPORTED_DELIMITERS = [",", ";", "|", "\t"] as const;
export type SupportedDelimiter = (typeof SUPPORTED_DELIMITERS)[number];

const HEADER_HINTS = new Set([
  "nome", "name", "nome completo", "telefone", "phone", "celular", "whatsapp",
  "email", "e-mail", "empresa", "company", "opt_in", "consentimento",
]);

export function detectDelimiter(content: string): SupportedDelimiter {
  const sample = content.split(/\r?\n/).filter(Boolean).slice(0, 8);
  let best: SupportedDelimiter = ",";
  let bestScore = -1;
  for (const delimiter of SUPPORTED_DELIMITERS) {
    const counts = sample.map((line) => countUnquoted(line, delimiter));
    const positive = counts.filter((count) => count > 0);
    const consistent = positive.length > 1 && positive.every((count) => count === positive[0]);
    const score = positive.reduce((sum, count) => sum + count, 0) + (consistent ? 100 : 0);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

function countUnquoted(line: string, delimiter: string) {
  let quoted = false;
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') quoted = !quoted;
    else if (!quoted && line[i] === delimiter) count += 1;
  }
  return count;
}

export function parseDelimited(content: string, delimiter = detectDelimiter(content)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || (char === "\r" && next === "\n")) && !quoted) {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      if (char === "\r") index += 1;
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function hasHeaderRow(row: string[]) {
  return row.some((cell) => HEADER_HINTS.has(cell.trim().toLowerCase()));
}

export function parseImportFile(content: string, requestedDelimiter?: SupportedDelimiter) {
  const delimiter = requestedDelimiter ?? detectDelimiter(content);
  const rows = parseDelimited(content.replace(/^\uFEFF/, ""), delimiter);
  if (!rows.length) return { delimiter, headers: [], rows: [], hasHeader: false };
  const header = hasHeaderRow(rows[0]);
  const headers = header
    ? rows[0].map((value, index) => value || `coluna_${index + 1}`)
    : rows[0].map((_, index) => `coluna_${index + 1}`);
  return { delimiter, headers, rows: header ? rows.slice(1) : rows, hasHeader: header };
}

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "nome completo", "cliente"],
  phone: ["telefone", "phone", "celular", "whatsapp", "fone"],
  email: ["email", "e-mail"],
  company: ["empresa", "company", "organização", "organizacao"],
  consent: ["opt_in", "opt-in", "consentimento", "consent"],
  optInAt: ["opt_in_at", "data consentimento"],
  optInSource: ["opt_in_source", "origem consentimento"],
};

export function suggestMapping(headers: string[]) {
  return Object.fromEntries(headers.map((header) => {
    const normalized = header.trim().toLowerCase();
    const known = Object.entries(FIELD_ALIASES).find(([, aliases]) => aliases.includes(normalized));
    return [header, known?.[0] ?? `custom.${slugField(header)}`];
  }));
}

export function slugField(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "campo";
}
