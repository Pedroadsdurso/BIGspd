import { createHash } from "node:crypto";
import type { MetaWhatsAppClient, SendTemplateInput } from "@/lib/meta/types";

export class MockMetaWhatsAppClient implements MetaWhatsAppClient {
  async getBusinessAccount() { return { id: "mock-waba", name: "Ambiente Mock" }; }
  async getPhoneNumbers() { return [{ id: "mock-phone", display_phone_number: "+55 11 99999-0000", verified_name: "Ambiente Mock", quality_rating: "GREEN", status: "CONNECTED" }]; }
  async getTemplates() {
    return [{
      id: "mock-template-1",
      name: "ola_cliente",
      language: "pt_BR",
      category: "MARKETING",
      status: "APPROVED",
      components: [{ type: "BODY", text: "Olá {{1}}, temos uma novidade para você." }],
    }];
  }
  async sendTemplateMessage(input: SendTemplateInput) {
    return { messageId: `mock_wamid_${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 24)}` };
  }
  async sendTextMessage(input: { to: string; text: string }) {
    return { messageId: `mock_wamid_${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 24)}` };
  }
  async getMessagingLimit() { return 250; }
  async getMessageStatus(messageId: string) { return { status: "WEBHOOK_REQUIRED" as const, messageId }; }
  async testConnection() {
    return { connected: true, wabaFound: true, phoneFound: true, apiAccessible: true, businessName: "Ambiente Mock", displayPhoneNumber: "+55 11 99999-0000" };
  }
}
