export type WhatsAppStatusEvent = {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp?: string;
  errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }>;
};

export type WhatsAppIncomingMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  [key: string]: unknown;
};

export type TemplateStatusEvent = {
  event?: string;
  message_template_id?: number | string;
  message_template_name?: string;
  message_template_language?: string;
  reason?: string | null;
};

export function extractWebhookEvents(payload: unknown) {
  const statuses: WhatsAppStatusEvent[] = [];
  const messages: WhatsAppIncomingMessage[] = [];
  const contacts: Array<{ wa_id?: string; profile?: { name?: string } }> = [];
  const templateStatuses: TemplateStatusEvent[] = [];
  const root = payload as { entry?: Array<{ changes?: Array<{ field?: string; value?: { statuses?: WhatsAppStatusEvent[]; messages?: WhatsAppIncomingMessage[]; contacts?: typeof contacts } & TemplateStatusEvent }> }> };
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "message_template_status_update" && change.value) {
        templateStatuses.push(change.value);
        continue;
      }
      statuses.push(...(change.value?.statuses ?? []));
      messages.push(...(change.value?.messages ?? []));
      contacts.push(...(change.value?.contacts ?? []));
    }
  }
  return { statuses, messages, contacts, templateStatuses };
}

const DEFAULT_STOP_WORDS = ["SAIR", "PARAR", "STOP", "CANCELAR", "NÃO QUERO", "NAO QUERO"];

export function isOptOutText(text: string, configured = DEFAULT_STOP_WORDS) {
  const normalized = text.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  return configured.some((word) => normalized === word.toLocaleUpperCase("pt-BR"));
}
