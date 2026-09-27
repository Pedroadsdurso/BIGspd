import type { MetaClientConfig, MetaConnectionResult, MetaPhoneNumber, MetaTemplate, MetaWhatsAppClient, SendTemplateInput } from "@/lib/meta/types";
import { parseMetaError } from "@/lib/meta/errors";

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
    const components = input.bodyParameters.length ? [{
      type: "body",
      parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
    }] : undefined;
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
