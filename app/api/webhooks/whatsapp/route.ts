import { verifyMetaSignature, verifyWebhookChallenge } from "@/lib/webhooks/verify";
import { persistAndProcessWebhook } from "@/lib/webhooks/service";
import { log } from "@/lib/logger";
import { getWebhookSecrets } from "@/lib/webhooks/secrets";

export async function GET(request: Request) {
  const { verifyToken } = await getWebhookSecrets();
  const challenge = verifyWebhookChallenge(new URL(request.url).searchParams, verifyToken);
  return challenge ? new Response(challenge, { status: 200 }) : new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const { appSecret } = await getWebhookSecrets();
  const valid = verifyMetaSignature(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    appSecret,
  );
  if (!valid) return new Response("Invalid signature", { status: 401 });
  try {
    await persistAndProcessWebhook(rawBody, true);
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    log("error", "webhook.processing_failed", { error: error instanceof Error ? error.message : String(error) });
    return new Response("Processing failed", { status: 500 });
  }
}
