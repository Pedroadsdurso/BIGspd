import { timingSafeEqual } from "node:crypto";
import { dispatchDueRecipients } from "@/lib/campaigns/dispatcher";
import { DISPATCH_BUDGET_MS } from "@/lib/campaigns/dispatch-after";
import { log } from "@/lib/logger";

export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? new URL(request.url).searchParams.get("key")
    ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Vercel Cron chama com GET + "Authorization: Bearer $CRON_SECRET".
// Agendadores externos (cron-job.org etc.) podem usar ?key=$CRON_SECRET.
export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const result = await dispatchDueRecipients({ deadlineMs: Date.now() + DISPATCH_BUDGET_MS });
    return Response.json(result);
  } catch (error) {
    log("error", "dispatch.cron_failed", { error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: "Falha no dispatch" }, { status: 500 });
  }
}
