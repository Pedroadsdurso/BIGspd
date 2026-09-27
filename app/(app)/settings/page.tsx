import Link from "next/link";
import { Database, KeyRound, MessageSquareText, ServerCog } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
const items = [
  ["WhatsApp Cloud API", "WABA, número, token e versão da Graph API.", "/settings/whatsapp", MessageSquareText],
  ["Banco de dados", "PostgreSQL gerenciado pelo Prisma.", "#", Database],
  ["Fila e worker", "Redis, BullMQ, concorrência e backoff.", "#", ServerCog],
  ["Segurança", "Sessão do proprietário e criptografia de credenciais.", "#", KeyRound],
] as const;
export default function SettingsPage() { return <><PageHeader eyebrow="Administração" title="Configurações" description="Parâmetros operacionais da instalação single-tenant." /><div className="grid gap-4 md:grid-cols-2">{items.map(([title, description, href, Icon]) => <Card key={title} className="shadow-none"><CardHeader><div className="mb-3 w-fit rounded-xl bg-[var(--surface-muted)] p-2.5 text-[var(--primary)]"><Icon className="h-5 w-5" /></div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{href !== "#" ? <Link className="text-sm font-semibold text-[var(--primary-strong)]" href={href}>Configurar →</Link> : <span className="text-sm text-[var(--muted)]">Configurado por variáveis de ambiente</span>}</CardContent></Card>)}</div></>; }
