import { describe, expect, it } from "vitest";
import { detectDelimiter, parseDelimited, parseImportFile, suggestMapping } from "@/lib/contacts/parser";

describe("parser CSV/TXT", () => {
  it("detecta pipe", () => expect(detectDelimiter("João|5511999999999\nMaria|5521999999999")).toBe("|"));
  it("preserva vírgula dentro de aspas", () => expect(parseDelimited('nome,empresa\n"Silva, João","ACME"', ",")[1][0]).toBe("Silva, João"));
  it("detecta cabeçalho e sugere campos", () => { const parsed = parseImportFile("Nome completo;Celular;Cidade\nJoão;11999999999;São Paulo"); expect(parsed.hasHeader).toBe(true); expect(suggestMapping(parsed.headers)).toEqual({ "Nome completo": "name", Celular: "phone", Cidade: "custom.cidade" }); });
  it("gera colunas quando TXT não possui cabeçalho", () => { const parsed = parseImportFile("João|5511999999999\nMaria|5521999999999"); expect(parsed.hasHeader).toBe(false); expect(parsed.headers).toEqual(["coluna_1", "coluna_2"]); expect(parsed.rows).toHaveLength(2); });
});
