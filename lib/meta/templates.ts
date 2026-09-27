import "server-only";
import { prisma } from "@/lib/prisma";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { Prisma } from "@/lib/generated/prisma/client";

const categories = new Set(["MARKETING", "UTILITY", "AUTHENTICATION"]);
const statuses = new Set(["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED"]);

export async function syncTemplates(userId: string) {
  const account = await prisma.whatsAppAccount.findFirst({ where: { userId } });
  if (!account) throw new Error("Configure uma conta WhatsApp antes de sincronizar templates.");
  const templates = await (await getMetaClientForAccount(account)).getTemplates();
  for (const template of templates) {
    await prisma.template.upsert({
      where: { accountId_name_language: { accountId: account.id, name: template.name, language: template.language } },
      create: {
        accountId: account.id,
        providerId: template.id,
        name: template.name,
        language: template.language,
        category: categories.has(template.category) ? template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION" : "UNKNOWN",
        status: statuses.has(template.status) ? template.status as "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" : "UNKNOWN",
        components: template.components as Prisma.InputJsonValue,
        variables: extractTemplateVariables(template.components),
      },
      update: {
        providerId: template.id,
        category: categories.has(template.category) ? template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION" : "UNKNOWN",
        status: statuses.has(template.status) ? template.status as "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" : "UNKNOWN",
        components: template.components as Prisma.InputJsonValue,
        variables: extractTemplateVariables(template.components),
        lastSyncedAt: new Date(),
      },
    });
  }
  return { synced: templates.length };
}

export function extractTemplateVariables(components: unknown[]) {
  const variables = new Set<string>();
  for (const component of components as Array<{ text?: string }>) {
    for (const match of component.text?.matchAll(/\{\{\s*(\d+)\s*\}\}/g) ?? []) variables.add(match[1]);
  }
  return [...variables].sort((a, b) => Number(a) - Number(b));
}
