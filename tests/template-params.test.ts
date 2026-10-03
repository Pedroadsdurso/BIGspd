import { describe, expect, it } from "vitest";
import { buildTemplateComponents, extractTemplateVariables } from "@/lib/meta/template-params";

describe("parâmetros de template", () => {
  it("separa variável do cabeçalho e do corpo", () => {
    const components = [{ type: "HEADER", format: "TEXT", text: "Oi {{1}}" }, { type: "BODY", text: "Pedido {{1}} de {{2}}" }];
    expect(extractTemplateVariables(components)).toEqual(["header:1", "1", "2"]);
    expect(buildTemplateComponents(components, { "header:1": "Pedro", "1": "123", "2": "hoje" })).toEqual([
      { type: "header", parameters: [{ type: "text", text: "Pedro" }] },
      { type: "body", parameters: [{ type: "text", text: "123" }, { type: "text", text: "hoje" }] },
    ]);
  });

  it("envia parâmetros nomeados com parameter_name", () => {
    const components = [{ type: "BODY", text: "Olá {{nome}}" }];
    expect(extractTemplateVariables(components)).toEqual(["nome"]);
    expect(buildTemplateComponents(components, { nome: "Pedro" })).toEqual([{ type: "body", parameters: [{ type: "text", parameter_name: "nome", text: "Pedro" }] }]);
  });

  it("inclui mídia do cabeçalho e botão de URL dinâmica", () => {
    const components = [
      { type: "HEADER", format: "IMAGE", example: { header_handle: ["https://cdn.example/img.jpg"] } },
      { type: "BODY", text: "Olá" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sair" }, { type: "URL", url: "https://x.com/p/{{1}}" }] },
    ];
    expect(extractTemplateVariables(components)).toEqual(["header:media", "button:1:1"]);
    expect(buildTemplateComponents(components, { "header:media": "https://meu.site/banner.png", "button:1:1": "abc" })).toEqual([
      { type: "header", parameters: [{ type: "image", image: { link: "https://meu.site/banner.png" } }] },
      { type: "button", sub_type: "url", index: "1", parameters: [{ type: "text", text: "abc" }] },
    ]);
  });

  it("falha com mensagem clara quando falta valor", () => {
    expect(() => buildTemplateComponents([{ type: "HEADER", format: "TEXT", text: "{{1}}" }], {})).toThrow("Cabeçalho {{1}}");
  });
});

describe("valor fixo no mapeamento", () => {
  it("usa literal: sem consultar o contato", async () => {
    const { renderVariables } = await import("@/lib/campaigns/variables");
    expect(renderVariables({ name: "Pedro", phone: "55" }, { "header:media": "literal:https://meu.site/a.png", "1": "name" })).toEqual({ values: { "header:media": "https://meu.site/a.png", "1": "Pedro" }, missing: [] });
  });
});
