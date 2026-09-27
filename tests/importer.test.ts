import { describe, expect, it } from "vitest";
import { mapImportRows } from "@/lib/contacts/importer";

describe("importação", () => {
  it("aceita nome e telefone sem opt_in", () => { const result = mapImportRows(["nome", "telefone"], [["João", "11999999999"]], { nome: "name", telefone: "phone" }); expect(result.contacts[0]).toMatchObject({ name: "João", phone: "5511999999999", consentStatus: "UNKNOWN" }); });
  it("importa consentimento fornecido", () => { const result = mapImportRows(["nome", "telefone", "opt_in"], [["João", "11999999999", "sim"]], { nome: "name", telefone: "phone", opt_in: "consent" }); expect(result.contacts[0].consentStatus).toBe("OPTED_IN"); });
  it("detecta duplicados e inválidos", () => { const result = mapImportRows(["nome", "telefone"], [["A", "11999999999"], ["B", "11999999999"], ["C", ""]], { nome: "name", telefone: "phone" }); expect(result.duplicates).toBe(1); expect(result.invalid).toBe(1); });
  it("preserva campos personalizados", () => { const result = mapImportRows(["nome", "telefone", "cidade"], [["A", "11999999999", "Recife"]], { nome: "name", telefone: "phone", cidade: "custom.cidade" }); expect(result.contacts[0].customFields).toEqual({ cidade: "Recife" }); });
});
