export type ContactFields = {
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  customFields?: Record<string, unknown> | null;
};

export function resolveContactField(contact: ContactFields, path: string): string | undefined {
  if (["name", "phone", "email", "company"].includes(path)) {
    const value = contact[path as keyof Omit<ContactFields, "customFields">];
    return value == null ? undefined : String(value);
  }
  const customKey = path.startsWith("custom.") ? path.slice(7) : path;
  const value = contact.customFields?.[customKey];
  return value == null || value === "" ? undefined : String(value);
}

/** Valor fixo para todos os contatos (ex.: URL da mídia do cabeçalho). */
export const LITERAL_PREFIX = "literal:";

export function renderVariables(contact: ContactFields, mapping: Record<string, string>) {
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const [position, source] of Object.entries(mapping)) {
    const value = source.startsWith(LITERAL_PREFIX) ? source.slice(LITERAL_PREFIX.length).trim() : resolveContactField(contact, source);
    if (!value) missing.push(position);
    else values[position] = value;
  }
  return { values, missing };
}

export function renderTemplatePreview(body: string, variables: Record<string, string>) {
  return body.replace(/\{\{\s*([^}]+)\s*\}\}/g, (token, key: string) => variables[key.trim()] ?? token);
}
