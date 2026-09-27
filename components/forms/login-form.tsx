"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setLoading(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    setLoading(false);
    if (!response.ok) return toast.error("Credenciais inválidas");
    router.replace("/dashboard"); router.refresh();
  }}><div><Label htmlFor="email">E-mail do proprietário</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div><Button className="w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button></form>;
}
