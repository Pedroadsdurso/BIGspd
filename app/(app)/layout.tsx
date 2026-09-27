import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { const session = await requireUser(); return <AppShell email={session.email}>{children}</AppShell>; }
