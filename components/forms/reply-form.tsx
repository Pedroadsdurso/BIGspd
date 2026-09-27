"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ReplyForm({ contactId, enabled }: { contactId: string; enabled: boolean }) { const [text, setText] = useState(""); const router = useRouter(); if (!enabled) return <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-[var(--warning)]">A janela de atendimento terminou. Selecione um template aprovado para iniciar uma nova conversa.</p>; return <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); const response = await fetch(`/api/inbox/${contactId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); const data = await response.json(); if (!response.ok) return toast.error(data.error || "Falha ao enviar"); setText(""); toast.success("Mensagem aceita pela Cloud API"); router.refresh(); }}><Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Responder dentro da janela de atendimento" required /><Button>Enviar</Button></form>; }
