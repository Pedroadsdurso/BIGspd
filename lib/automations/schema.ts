import { z } from "zod";

export const autoReplyRuleSchema = z.object({
  name: z.string().trim().min(1).max(160),
  keywords: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
  matchType: z.enum(["CONTAINS", "EXACT"]),
  replyText: z.string().trim().min(1).max(4096),
  active: z.boolean(),
  cooldownMinutes: z.number().int().min(0).max(43_200),
});
