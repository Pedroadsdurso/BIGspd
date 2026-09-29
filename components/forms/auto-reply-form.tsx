"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export type AutoReplyRuleInput = { id?: string; name: string; keywords: string[]; matchType: "CONTAINS" | "EXACT"; replyText: string; active: boolean; cooldownMinutes: number };

const emptyRule: AutoReplyRuleInput = { name: "", keywords: [], matchType: "CONTAINS", replyText: "", active: true, cooldownMinutes: 60 };

export function AutoReplyForm({ rule }: { rule?: AutoReplyRuleInput }) {
  const router = useRouter();
  const initial = rule ?? emptyRule;
  const [name, setName] = useState(initial.name);
  const [keywords, setKeywords] = useState(initial.keywords.join(", "));
  const [matchType, setMatchType] = useState(initial.matchType);
  const [replyText, setReplyText] = useState(initial.replyText);
  const [active, setActive] = useState(initial.active);
  const [cooldownMinutes, setCooldownMinutes] = useState(String(initial.cooldownMinutes));
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { name, keywords: keywords.split(",").map((item) => item.trim()).filter(Boolean), matchType, replyText, active, cooldownMinutes: Number(cooldownMinutes) || 0 };
    if (!payload.keywords.length) return toast.error("Informe pelo menos uma palavra-chave");
    setLoading(true);
    const response = await fetch(rule?.id ? `/api/automations/${rule.id}` : "/api/automations", { method: rule?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(data.error || "Falha ao salvar automação");
    toast.success(rule?.id ? "Automação atualizada" : "Automação criada");
    if (!rule?.id) { setName(""); setKeywords(""); setReplyText(""); setMatchType("CONTAINS"); setActive(true); setCooldownMinutes("60"); }
    router.refresh();
  }

  async function remove() {
    if (!rule?.id || !window.confirm(`Excluir a automação "${rule.name}"?`)) return;
    setLoading(true);
    const response = await fetch(`/api/automations/${rule.id}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(data.error || "Falha ao excluir");
    toast.success("Automação excluída");
    router.refresh();
  }

  const fieldId = (field: string) => `${rule?.id ?? "new"}-${field}`;
  return <form className="grid gap-4" onSubmit={submit}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor={fieldId("name")}>Nome</Label><Input id={fieldId("name")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Falar com atendente" required /></div>
      <div><Label htmlFor={fieldId("keywords")}>Palavras-chave (separadas por vírgula)</Label><Input id={fieldId("keywords")} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="falar com atendente, atendente, humano" required /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div><Label htmlFor={fieldId("match")}>Correspondência</Label><select id={fieldId("match")} value={matchType} onChange={(e) => setMatchType(e.target.value as "CONTAINS" | "EXACT")} className="h-11 w-full rounded-xl border bg-[var(--surface)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]"><option value="CONTAINS">Mensagem contém a palavra</option><option value="EXACT">Mensagem é exatamente a palavra</option></select></div>
      <div><Label htmlFor={fieldId("cooldown")}>Não repetir por (minutos)</Label><Input id={fieldId("cooldown")} type="number" min={0} max={43200} value={cooldownMinutes} onChange={(e) => setCooldownMinutes(e.target.value)} /></div>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />Ativa</label>
    </div>
    <div><Label htmlFor={fieldId("reply")}>Mensagem automática</Label><textarea id={fieldId("reply")} value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4} maxLength={4096} required placeholder="Olá {{primeiro_nome}}! Recebemos seu pedido e um atendente vai falar com você em instantes." className="w-full rounded-xl border bg-[var(--surface)] p-3 text-sm outline-none placeholder:text-[var(--muted)] focus:ring-2 focus:ring-[var(--primary)]" /><p className="mt-1 text-xs text-[var(--muted)]">Variáveis: {"{{nome}}"}, {"{{primeiro_nome}}"}, {"{{telefone}}"}</p></div>
    <div className="flex gap-2"><Button disabled={loading}>{loading ? "Salvando…" : rule?.id ? "Salvar" : "Criar automação"}</Button>{rule?.id && <Button type="button" variant="ghost" disabled={loading} onClick={remove}>Excluir</Button>}</div>
  </form>;
}
