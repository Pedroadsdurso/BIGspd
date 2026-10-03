import { z } from "zod";
import { withApi } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security/request";
import { HEADER_MEDIA_KEY, describeTemplateVariable, extractTemplateVariables } from "@/lib/meta/template-params";

const schema = z.object({
  name: z.string().min(1).max(200),
  listId: z.string().min(1),
  templateId: z.string().min(1),
  language: z.string().min(2).max(20),
  variableMapping: z.record(z.string(), z.string()),
  scheduledAt: z.string().datetime().optional(),
  timezone: z.string().default("America/Sao_Paulo"),
});

export async function GET() {
  return withApi(async () => {
    const session = await requireApiUser();
    return prisma.campaign.findMany({
      where: { userId: session.userId },
      include: { list: true, template: true, _count: { select: { recipients: true } } },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    const session = await requireApiUser();
    const body = schema.parse(await request.json());
    const template = await prisma.template.findUnique({ where: { id: body.templateId } });
    if (!template || template.status !== "APPROVED") return Response.json({ error: "Template inexistente ou não aprovado" }, { status: 400 });
    const unmapped = extractTemplateVariables(template.components).filter((key) => !body.variableMapping[key]);
    if (unmapped.length) return Response.json({ error: `Mapeie todas as variáveis do template: ${unmapped.map(describeTemplateVariable).join(", ")}` }, { status: 400 });
    const mediaSource = body.variableMapping[HEADER_MEDIA_KEY];
    if (mediaSource !== undefined && !/^literal:https:\/\/\S+$/.test(mediaSource)) {
      return Response.json({ error: "A mídia do cabeçalho precisa ser uma URL pública começando com https://" }, { status: 400 });
    }
    const campaign = await prisma.campaign.create({
      data: {
        userId: session.userId,
        listId: body.listId,
        templateId: body.templateId,
        name: body.name,
        language: body.language,
        category: template.category,
        variableMapping: body.variableMapping,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        timezone: body.timezone,
        status: body.scheduledAt ? "SCHEDULED" : "DRAFT",
      },
    });
    return Response.json(campaign, { status: 201 });
  });
}
