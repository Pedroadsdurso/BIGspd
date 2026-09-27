import { redirect } from "next/navigation";
import { MessageSquareText, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/forms/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center px-4 py-10 grid-dots"><div className="w-full max-w-md"><div className="mb-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--primary)] text-[#04100b]"><MessageSquareText /></span><div><h1 className="text-xl font-bold">WA Console</h1><p className="text-sm text-[var(--muted)]">Operação single-tenant</p></div></div><Card><CardHeader><CardTitle>Acesso do proprietário</CardTitle><CardDescription>Use as credenciais configuradas no ambiente. Tokens da Meta nunca são enviados ao navegador.</CardDescription></CardHeader><CardContent><LoginForm /></CardContent></Card><p className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck className="h-4 w-4" />Integração exclusiva com a WhatsApp Cloud API oficial</p></div></main>;
}
