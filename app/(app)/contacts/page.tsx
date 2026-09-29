import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { StatusBadge } from "@/components/data/status-badge";
import { EmptyState } from "@/components/data/empty-state";
import { GrantConsentButton } from "@/components/forms/simple-actions";
import { formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function ContactsPage() { const { userId } = await requireUser(); const contacts = await prisma.contact.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }); return <><PageHeader eyebrow="Base de relacionamento" title="Contatos" description="Contatos importados permanecem separados da elegibilidade para envio." actions={<><GrantConsentButton /><Button variant="secondary" asChild><Link href="/contacts/import"><Upload className="h-4 w-4" />Importar</Link></Button><Button><Plus className="h-4 w-4" />Novo contato</Button></>} /><Card><CardContent className="p-0">{contacts.length ? <Table><THead><tr><TH>Nome</TH><TH>Telefone</TH><TH>E-mail</TH><TH>Consentimento</TH><TH>Opt-out</TH><TH>Criado</TH></tr></THead><TBody>{contacts.map((contact) => <tr key={contact.id}><TD><Link className="font-semibold hover:text-[var(--primary)]" href={`/contacts/${contact.id}`}>{contact.name}</Link></TD><TD>{contact.phone}</TD><TD>{contact.email || "—"}</TD><TD><StatusBadge status={contact.consentStatus} /></TD><TD>{contact.optOut ? <StatusBadge status="OPTED_OUT" /> : "Não"}</TD><TD>{formatDate(contact.createdAt)}</TD></tr>)}</TBody></Table> : <EmptyState title="Nenhum contato" description="Importe um arquivo CSV/TXT ou adicione o primeiro contato." />}</CardContent></Card></>; }
