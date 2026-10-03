/**
 * Monta os `components` de envio a partir da estrutura real do template da Meta.
 *
 * Chaves de variável (as mesmas usadas no mapeamento da campanha):
 *  - corpo:     "1", "2"… (posicional) ou "nome" (nomeado)
 *  - cabeçalho: "header:1" ou "header:nome"
 *  - botão URL: "button:<índice>:1"
 */

type TemplateButton = { type?: string; url?: string; example?: string[] };
type TemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: TemplateButton[];
  example?: { header_handle?: string[]; header_url?: string[] };
};

type SendParameter = Record<string, unknown>;
export type SendComponent = { type: string; sub_type?: string; index?: string; parameters: SendParameter[] };

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
const MEDIA_FORMATS = new Set(["IMAGE", "VIDEO", "DOCUMENT"]);

function placeholders(text: string | undefined) {
  const found: string[] = [];
  for (const match of text?.matchAll(PLACEHOLDER) ?? []) if (!found.includes(match[1])) found.push(match[1]);
  return found;
}

function isNamed(name: string) {
  return !/^\d+$/.test(name);
}

function sortKeys(keys: string[]) {
  return [...keys].sort((a, b) => (isNamed(a) || isNamed(b) ? a.localeCompare(b) : Number(a) - Number(b)));
}

function asComponents(components: unknown): TemplateComponent[] {
  return Array.isArray(components) ? components as TemplateComponent[] : [];
}

export function extractTemplateVariables(components: unknown) {
  const keys: string[] = [];
  for (const component of asComponents(components)) {
    const type = component.type?.toUpperCase();
    if (type === "BODY") keys.push(...sortKeys(placeholders(component.text)));
    if (type === "HEADER" && (component.format ?? "TEXT").toUpperCase() === "TEXT") {
      keys.push(...placeholders(component.text).map((name) => `header:${name}`));
    }
    if (type === "BUTTONS") {
      component.buttons?.forEach((button, index) => {
        if (button.type?.toUpperCase() === "URL") keys.push(...placeholders(button.url).map((name) => `button:${index}:${name}`));
      });
    }
  }
  return keys;
}

export function describeTemplateVariable(key: string) {
  if (key.startsWith("header:")) return `Cabeçalho {{${key.slice(7)}}}`;
  const button = key.match(/^button:(\d+):(.+)$/);
  if (button) return `Botão ${Number(button[1]) + 1} (URL) {{${button[2]}}}`;
  return `{{${key}}}`;
}

function textParameters(names: string[], values: Record<string, string>, prefix: string) {
  return names.map((name) => {
    const text = values[`${prefix}${name}`];
    if (!text) throw new Error(`Variável ${describeTemplateVariable(`${prefix}${name}`)} sem valor.`);
    return isNamed(name) ? { type: "text", parameter_name: name, text } : { type: "text", text };
  });
}

export function buildTemplateComponents(components: unknown, values: Record<string, string>): SendComponent[] {
  const result: SendComponent[] = [];
  for (const component of asComponents(components)) {
    const type = component.type?.toUpperCase();

    if (type === "HEADER") {
      const format = (component.format ?? "TEXT").toUpperCase();
      if (format === "TEXT") {
        const names = placeholders(component.text);
        if (names.length) result.push({ type: "header", parameters: textParameters(names, values, "header:") });
      } else if (MEDIA_FORMATS.has(format)) {
        // A Meta exige a mídia no envio; usa a mídia de exemplo cadastrada no template.
        const link = component.example?.header_handle?.[0] ?? component.example?.header_url?.[0];
        if (!link) throw new Error(`Template com cabeçalho ${format} sem mídia de exemplo para enviar.`);
        const media = format.toLowerCase();
        result.push({ type: "header", parameters: [{ type: media, [media]: { link } }] });
      }
    }

    if (type === "BODY") {
      const names = sortKeys(placeholders(component.text));
      if (names.length) result.push({ type: "body", parameters: textParameters(names, values, "") });
    }

    if (type === "BUTTONS") {
      component.buttons?.forEach((button, index) => {
        if (button.type?.toUpperCase() !== "URL") return;
        const names = placeholders(button.url);
        if (!names.length) return;
        result.push({
          type: "button",
          sub_type: "url",
          index: String(index),
          parameters: textParameters(names, values, `button:${index}:`).map(({ text }) => ({ type: "text", text })),
        });
      });
    }
  }
  return result;
}
