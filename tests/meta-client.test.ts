import { afterEach, describe, expect, it, vi } from "vitest";
import { CloudApiMetaWhatsAppClient } from "@/lib/meta/client";
import { MetaApiError } from "@/lib/meta/errors";
const client = new CloudApiMetaWhatsAppClient({ apiVersion: "v25.0", accessToken: "token", wabaId: "waba", phoneNumberId: "phone" });
afterEach(() => vi.unstubAllGlobals());
describe("Meta Cloud API client", () => {
  it("envia template pelo endpoint oficial", async () => { const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200, headers: { "Content-Type": "application/json" } })); vi.stubGlobal("fetch", fetchMock); await expect(client.sendTemplateMessage({ to: "5511999999999", templateName: "ola", language: "pt_BR", components: [{ type: "body", parameters: [{ type: "text", text: "João" }] }] })).resolves.toEqual({ messageId: "wamid.1" }); expect(fetchMock).toHaveBeenCalledWith("https://graph.facebook.com/v25.0/phone/messages", expect.objectContaining({ method: "POST" })); });
  it("preserva erro estruturado e Retry-After", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Limit", code: 80007 } }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "30" } }))); await expect(client.sendTextMessage({ to: "5511", text: "x" })).rejects.toMatchObject<Partial<MetaApiError>>({ httpStatus: 429, code: 80007, retryAfterSeconds: 30 }); });
});
