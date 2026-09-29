import { describe, expect, it } from "vitest";
import { extractIncomingTexts, findMatchingRule, renderReplyText, ruleMatches } from "@/lib/automations/matcher";

const rule = { id: "r1", keywords: ["Falar com atendente", "humano"], matchType: "CONTAINS" as const };

describe("automações", () => {
  it("extrai texto de mensagem, botão de template e resposta interativa", () => {
    expect(extractIncomingTexts({ id: "1", from: "55", type: "text", text: { body: "oi" } })).toEqual(["oi"]);
    expect(extractIncomingTexts({ id: "2", from: "55", type: "button", button: { text: "Falar com atendente", payload: "ATENDENTE" } })).toEqual(["Falar com atendente", "ATENDENTE"]);
    expect(extractIncomingTexts({ id: "3", from: "55", type: "interactive", interactive: { button_reply: { id: "b1", title: "Sim" } } })).toEqual(["Sim", "b1"]);
    expect(extractIncomingTexts({ id: "4", from: "55", type: "image" })).toEqual([]);
  });
  it("compara sem acento e sem diferenciar maiúsculas", () => {
    expect(ruleMatches(rule, ["quero FALAR com atendente por favor"])).toBe(true);
    expect(ruleMatches({ ...rule, keywords: ["atenção"] }, ["ATENCAO"])).toBe(true);
    expect(ruleMatches(rule, ["qual o preço?"])).toBe(false);
  });
  it("modo exato exige a mensagem inteira", () => {
    const exact = { ...rule, matchType: "EXACT" as const };
    expect(ruleMatches(exact, ["  falar   com atendente "])).toBe(true);
    expect(ruleMatches(exact, ["quero falar com atendente"])).toBe(false);
  });
  it("usa a primeira regra que corresponder", () => {
    const rules = [{ ...rule, id: "a", keywords: ["preço"] }, { ...rule, id: "b" }, { ...rule, id: "c" }];
    expect(findMatchingRule(rules, ["humano"])?.id).toBe("b");
    expect(findMatchingRule(rules, [])).toBeUndefined();
  });
  it("substitui variáveis do contato", () => {
    expect(renderReplyText("Olá {{primeiro_nome}} ({{ nome }}) - {{telefone}}", { name: "Maria Silva", phone: "5511999990000" })).toBe("Olá Maria (Maria Silva) - 5511999990000");
  });
});
