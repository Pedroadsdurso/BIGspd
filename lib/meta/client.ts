import type { MetaClientConfig, MetaConnectionResult, MetaPhoneNumber, MetaTemplate, MetaWhatsAppClient, SendTemplateInput } from "@/lib/meta/types";
import { MetaApiError, parseMetaError } from "@/lib/meta/errors";
import { parseMessagingTier } from "@/lib/meta/messaging-limit";

type GraphPage<T> = { data: T[]; paging?: { next?: string } };

export class CloudApiMetaWhatsAppClient implements MetaWhatsAppClient {
  constructor(private readonly config: MetaClientConfig) {}

  private url(path: string) {
    return `https://graph.facebook.com/${this.config.apiVersion}/${path.replace(/^\//, "")}`;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(this.url(path), {
      ...init,
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw parseMetaError(response.status, payload, response.headers.get("retry-after"));
    return payload as T;
  }

  getBusinessAccount() {
    return this.request<{ id: string; name?: string }>(`${this.config.wabaId}?fields=id,name`);
  }

  async getPhoneNumbers() {
    const response = await this.request<GraphPage<MetaPhoneNumber>>(
      `${this.config.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status&limit=100`,
    );
    return response.data;
  }

  async getTemplates() {
    const templates: MetaTemplate[] = [];
    let next: string | undefined = this.url(`${this.config.wabaId}/message_templates?fields=id,name,language,status,category,components&limit=100`);
    while (next && templates.length < 10_000) {
      const response = await fetch(next, { headers: { Authorization: `Bearer ${this.config.accessToken}` }, signal: AbortSignal.timeout(15_000) });
      const payload = await response.json().catch(() => ({})) as GraphPage<MetaTemplate>;
      if (!response.ok) throw parseMetaError(response.status, payload, response.headers.get("retry-after"));
      templates.push(...(payload.data ?? []));
      next = payload.paging?.next;
    }
    return templates;
  }

  async sendTemplateMessage(input: SendTemplateInput) {
    const components = input.components.length ? input.components : undefined;
    const response = await this.request<{ messages: Array<{ id: string }> }>(`${this.config.phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.language },
          ...(components ? { components } : {}),
        },
      }),
    });
    const messageId = response.messages?.[0]?.id;
    if (!messageId) throw new Error("A Meta aceitou a requisição sem retornar message ID.");
    return { messageId };
  }

  async sendTextMessage(input: { to: string; text: string; previewUrl?: boolean }) {
    const response = await this.request<{ messages: Array<{ id: string }> }>(`${this.config.phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: input.to,
        type: "text",
        text: { body: input.text, preview_url: input.previewUrl ?? false },
      }),
    });
    const messageId = response.messages?.[0]?.id;
    if (!messageId) throw new Error("A Meta aceitou a requisição sem retornar message ID.");
    return { messageId };
  }

  async getMessagingLimit() {
    // Campo novo (limite por portfólio/BM) primeiro; o antigo por número como reserva.
    // Campo inexistente na versão da API devolve erro #100, então tenta o próximo.
    for (const field of ["whatsapp_business_manager_messaging_limit", "messaging_limit_tier"]) {
      try {
        const payload = await this.request<Record<string, unknown>>(`${this.config.phoneNumberId}?fields=${field}`);
        const limit = parseMessagingTier(payload[field]);
        if (limit !== null) return limit;
      } catch (error) {
        if (!(error instanceof MetaApiError && error.code === 100)) throw error;
      }
    }
    return null;
  }

  async getMessageStatus(messageId: string) {
    return { status: "WEBHOOK_REQUIRED" as const, messageId };
  }

  async testConnection(): Promise<MetaConnectionResult> {
    const business = await this.getBusinessAccount();
    const phones = await this.getPhoneNumbers();
    const phone = phones.find((item) => item.id === this.config.phoneNumberId);
    return {
      connected: true,
      wabaFound: business.id === this.config.wabaId,
      phoneFound: Boolean(phone),
      apiAccessible: true,
      businessName: business.name ?? phone?.verified_name,
      displayPhoneNumber: phone?.display_phone_number,
    };
  }
}
