import "server-only";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";
import { getMetaClientForAccount } from "@/lib/meta/config";
import { extractIncomingTexts, findMatchingRule, renderReplyText } from "@/lib/automations/matcher";
import type { WhatsAppIncomingMessage } from "@/lib/webhooks/parser";
import type { Contact } from "@/lib/generated/prisma/client";

export async function runAutoReply(userId: string, contact: Contact, incoming: WhatsAppIncomingMessage) {
  if (contact.optOut) return;
  const rules = await prisma.autoReplyRule.findMany({ where: { userId, active: true }, orderBy: { createdAt: "asc" } });
  const rule = findMatchingRule(rules, extractIncomingTexts(incoming));
  if (!rule) return;

  if (rule.cooldownMinutes > 0) {
    const recent = await prisma.message.findFirst({
      where: { autoReplyRuleId: rule.id, contactId: contact.id, createdAt: { gte: new Date(Date.now() - rule.cooldownMinutes * 60_000) } },
      select: { id: true },
    });
    if (recent) return;
  }

  const text = renderReplyText(rule.replyText, contact);
  try {
    const account = await prisma.whatsAppAccount.findFirst({ where: { userId } });
    const sent = await (await getMetaClientForAccount(account)).sendTextMessage({ to: contact.phone, text });
    await prisma.message.create({
      data: { contactId: contact.id, autoReplyRuleId: rule.id, providerMessageId: sent.messageId, direction: "OUTBOUND", type: "TEXT", status: "SENT", content: { text: { body: text } }, sentAt: new Date() },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("error", "automation.auto_reply_failed", { ruleId: rule.id, contactId: contact.id, error: message });
    await prisma.message.create({
      data: { contactId: contact.id, autoReplyRuleId: rule.id, direction: "OUTBOUND", type: "TEXT", status: "FAILED", content: { text: { body: text } }, failedAt: new Date(), errorMessage: message },
    });
  }
}
