import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { CreateListForm, AddAllContactsButton } from "@/components/forms/simple-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";
export const dynamic = "force-dynamic";
export default async function ListsPage() { const { userId } = await requireUser(); const lists = await prisma.contactList.findMany({ where: { userId }, include: { _count: { select: { members: true, campaigns: true } } }, orderBy: { createdAt: "desc" } }); return <><PageHeader eyebrow="Segmentação" title="Listas" description="Agrupe contatos e preserve a avaliação de consentimento no momento do envio." /><Card className="mb-6"><CardHeader><CardTitle>Criar lista</CardTitle></CardHeader><CardContent><CreateListForm /></CardContent></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{lists.map((list) => <Card key={list.id} className="shadow-none"><CardHeader><CardTitle>{list.name}</CardTitle></CardHeader><CardContent><div className="mb-4 flex justify-between text-sm text-[var(--muted)]"><span>{list._count.members} contatos</span><span>{list._count.campaigns} campanhas</span></div><AddAllContactsButton listId={list.id} /></CardContent></Card>)}{!lists.length && <Card className="md:col-span-2"><EmptyState title="Nenhuma lista" description="Crie uma lista e associe contatos durante a importação." /></Card>}</div></>; }
