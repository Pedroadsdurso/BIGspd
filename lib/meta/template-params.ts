/**
 * Monta os `components` de envio a partir da estrutura real do template da Meta.
 *
 * Chaves de variável (as mesmas usadas no mapeamento da campanha):
 *  - corpo:     "1", "2"… (posicional) ou "nome" (nomeado)
 *  - cabeçalho: "header:1" ou "header:nome"
 *  - botão URL: "button:<índice>:1"
 *  - mídia do cabeçalho (IMAGE/VIDEO/DOCUMENT): "header:media" → URL pública
 */

export const HEADER_MEDIA_KEY = "header:media";

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
    if (type === "HEADER") {
      const format = (component.format ?? "TEXT").toUpperCase();
      if (format === "TEXT") keys.push(...placeholders(component.text).map((name) => `header:${name}`));
      if (MEDIA_FORMATS.has(format)) keys.push(HEADER_MEDIA_KEY);
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
  if (key === HEADER_MEDIA_KEY) return "Mídia do cabeçalho (URL)";
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
        // A Meta baixa a mídia a cada envio: precisa de URL pública. O link de exemplo
        // do template é assinado e expira, então só serve de último recurso.
        const link = values[HEADER_MEDIA_KEY] ?? component.example?.header_url?.[0] ?? component.example?.header_handle?.[0];
        if (!link) throw new Error(`Informe a URL da mídia do cabeçalho (${format}).`);
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
