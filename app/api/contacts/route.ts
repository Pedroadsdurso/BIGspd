import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/contacts/phone";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { Prisma } from "@/lib/generated/prisma/client";

const createContact = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().max(200).optional(),
  tags: z.array(z.string().max(60)).default([]),
  customFields: z.record(z.string(), z.unknown()).default({}),
  consentStatus: z.enum(["UNKNOWN", "OPTED_IN", "OPTED_OUT"]).default("UNKNOWN"),
  optInSource: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  return withApi(async () => {
    const session = await requireApiUser();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const take = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
    const tag = url.searchParams.get("tag");
    const company = url.searchParams.get("company");
    const consentStatus = url.searchParams.get("consent") as "UNKNOWN" | "OPTED_IN" | "OPTED_OUT" | null;
    const optOut = url.searchParams.get("optOut");
    const customKey = url.searchParams.get("customKey");
    const customValue = url.searchParams.get("customValue");
    const where: Prisma.ContactWhereInput = {
      userId: session.userId,
      ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { phone: { contains: query } }, { email: { contains: query, mode: "insensitive" as const } }] } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(company ? { company: { contains: company, mode: "insensitive" } } : {}),
      ...(consentStatus && ["UNKNOWN", "OPTED_IN", "OPTED_OUT"].includes(consentStatus) ? { consentStatus } : {}),
      ...(optOut === "true" || optOut === "false" ? { optOut: optOut === "true" } : {}),
      ...(customKey && customValue ? { customFields: { path: [customKey], equals: customValue } } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
      prisma.contact.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = createContact.parse(await request.json());
    const normalized = normalizePhone(body.phone);
    if (normalized.status !== "VALID") return Response.json({ error: "Telefone inválido" }, { status: 400 });
    const contact = await prisma.contact.create({
      data: {
        userId: session.userId,
        name: body.name,
        phone: normalized.phone,
        email: body.email || null,
        company: body.company,
        tags: body.tags,
        customFields: body.customFields as Prisma.InputJsonValue,
        consentStatus: body.consentStatus,
        optInAt: body.consentStatus === "OPTED_IN" ? new Date() : null,
        optInSource: body.consentStatus === "OPTED_IN" ? body.optInSource : null,
        optOut: body.consentStatus === "OPTED_OUT",
        optOutAt: body.consentStatus === "OPTED_OUT" ? new Date() : null,
      },
    });
    return Response.json(contact, { status: 201 });
  });
}
