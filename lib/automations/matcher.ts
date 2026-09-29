import type { WhatsAppIncomingMessage } from "@/lib/webhooks/parser";

export type AutoReplyMatchType = "CONTAINS" | "EXACT";

export type MatchableRule = {
  id: string;
  keywords: string[];
  matchType: AutoReplyMatchType;
};

type IncomingWithReplies = WhatsAppIncomingMessage & {
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
};

export function normalizeForMatch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

// Texto digitado, clique em quick reply de template (type "button") ou resposta interativa.
export function extractIncomingTexts(incoming: WhatsAppIncomingMessage) {
  const message = incoming as IncomingWithReplies;
  return [
    message.text?.body,
    message.button?.text,
    message.button?.payload,
    message.interactive?.button_reply?.title,
    message.interactive?.button_reply?.id,
    message.interactive?.list_reply?.title,
    message.interactive?.list_reply?.id,
  ].filter((value): value is string => Boolean(value?.trim()));
}

export function ruleMatches(rule: MatchableRule, texts: string[]) {
  const candidates = texts.map(normalizeForMatch);
  const keywords = rule.keywords.map(normalizeForMatch).filter(Boolean);
  return keywords.some((keyword) => candidates.some((text) => rule.matchType === "EXACT" ? text === keyword : text.includes(keyword)));
}

export function findMatchingRule<T extends MatchableRule>(rules: T[], texts: string[]) {
  if (!texts.length) return undefined;
  return rules.find((rule) => ruleMatches(rule, texts));
}

export function renderReplyText(template: string, contact: { name: string; phone: string }) {
  const firstName = contact.name.trim().split(/\s+/)[0] || contact.name;
  return template
    .replace(/\{\{\s*nome\s*\}\}/gi, contact.name)
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, firstName)
    .replace(/\{\{\s*telefone\s*\}\}/gi, contact.phone);
}
