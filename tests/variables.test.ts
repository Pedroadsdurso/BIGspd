import { describe, expect, it } from "vitest";
import { renderTemplatePreview, renderVariables } from "@/lib/campaigns/variables";
describe("variáveis", () => {
  it("resolve campos padrão e personalizados", () => expect(renderVariables({ name: "João", phone: "5511", customFields: { cidade: "São Paulo" } }, { "1": "name", "2": "custom.cidade" })).toEqual({ values: { "1": "João", "2": "São Paulo" }, missing: [] }));
  it("marca campo obrigatório ausente", () => expect(renderVariables({ name: "João", phone: "5511" }, { "1": "custom.produto" }).missing).toEqual(["1"]));
  it("renderiza prévia", () => expect(renderTemplatePreview("Olá {{1}} de {{2}}", { "1": "João", "2": "Recife" })).toBe("Olá João de Recife"));
});
