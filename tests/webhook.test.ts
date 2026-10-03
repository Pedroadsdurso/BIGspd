import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMetaSignature, verifyWebhookChallenge } from "@/lib/webhooks/verify";
import { extractWebhookEvents, isOptOutText } from "@/lib/webhooks/parser";
describe("webhook", () => {
  it("verifica assinatura sha256", () => { const body = '{"object":"whatsapp_business_account"}'; const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`; expect(verifyMetaSignature(body, signature, "secret")).toBe(true); expect(verifyMetaSignature(body, signature, "other")).toBe(false); });
  it("valida challenge", () => expect(verifyWebhookChallenge(new URLSearchParams("hub.mode=subscribe&hub.verify_token=abc&hub.challenge=123"), "abc")).toBe("123"));
  it("extrai status e mensagem", () => { const payload = { entry: [{ changes: [{ value: { statuses: [{ id: "wamid", status: "delivered" }], messages: [{ id: "in", from: "5511", type: "text", text: { body: "Olá" } }] } }] }] }; const events = extractWebhookEvents(payload); expect(events.statuses).toHaveLength(1); expect(events.messages).toHaveLength(1); });
  it("extrai atualização de status de template", () => { const payload = { entry: [{ changes: [{ field: "message_template_status_update", value: { event: "APPROVED", message_template_id: 123, message_template_name: "mode_rogerio_7777", message_template_language: "pt_BR" } }] }] }; const events = extractWebhookEvents(payload); expect(events.templateStatuses).toEqual([{ event: "APPROVED", message_template_id: 123, message_template_name: "mode_rogerio_7777", message_template_language: "pt_BR" }]); expect(events.statuses).toHaveLength(0); });
  it("detecta palavras exatas de opt-out", () => { expect(isOptOutText("  não   quero ")).toBe(true); expect(isOptOutText("não quero saber o preço")).toBe(false); });
});
