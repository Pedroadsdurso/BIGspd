import Link from "next/link";
import { BarChart3, BookOpen, ContactRound, Inbox, LayoutDashboard, List, MessageSquareText, Settings, ShieldBan } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";

const navigation = [
  ["Dashboard", "/dashboard", LayoutDashboard], ["Campanhas", "/campaigns", MessageSquareText], ["Contatos", "/contacts", ContactRound],
  ["Listas", "/lists", List], ["Templates", "/templates", BookOpen], ["Inbox", "/inbox", Inbox],
  ["WhatsApp", "/settings/whatsapp", BarChart3], ["Suppression", "/suppression", ShieldBan], ["Configurações", "/settings", Settings],
] as const;

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  return <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
    <aside className="border-b bg-[#071a14] px-4 py-4 text-white md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:px-4 md:py-6">
      <div className="flex items-center justify-between md:block">
        <Link href="/dashboard" className="flex items-center gap-3 px-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2ce6a0] font-black text-[#071a14]">W</span><span><b className="block tracking-tight">WA Console</b><small className="text-xs text-emerald-100/60">Cloud API oficial</small></span></Link>
        <div className="flex md:hidden"><ThemeToggle /><LogoutButton /></div>
      </div>
      <nav className="mt-5 flex gap-1 overflow-x-auto pb-1 md:mt-8 md:block md:space-y-1">
        {navigation.map(([label, href, Icon]) => <Link key={href} href={href} className="flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-emerald-50/70 transition hover:bg-white/8 hover:text-white"><Icon className="h-4 w-4" />{label}</Link>)}
      </nav>
      <div className="absolute bottom-5 hidden w-[218px] items-center justify-between border-t border-white/10 px-2 pt-4 md:flex"><span className="max-w-[130px] truncate text-xs text-emerald-50/60">{email}</span><div className="flex"><ThemeToggle /><LogoutButton /></div></div>
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
  </div>;
}
