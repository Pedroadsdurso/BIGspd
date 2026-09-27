import { z } from "zod";
import { createSession, verifyOwnerCredentials } from "@/lib/auth/session";
import { withApi } from "@/lib/api/response";
import { assertSameOrigin, checkRateLimit, requestIp } from "@/lib/security/request";

const input = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    if (!checkRateLimit(`login:${requestIp(request)}`, 10, 15 * 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = input.parse(await request.json());
    const user = await verifyOwnerCredentials(body.email, body.password);
    if (!user) return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    await createSession(user);
    return { ok: true };
  });
}
