import { z } from "zod";
import { createSession, verifyOwnerCredentials } from "@/lib/auth/session";
import { withApi } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { assertSameOrigin, checkRateLimit, requestIp } from "@/lib/security/request";

const input = z.object({ email: z.string().email(), password: z.string().min(8).max(200) });

function describeLoginFailure(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code ?? "";
  if (code === "P2021" || code === "P2022" || /does not exist|relation .* does not exist|no such table|table .* not found/i.test(msg)) {
    return "Banco não inicializado: rode as migrations (Actions → 'Initialize production database' → Run workflow).";
  }
  if (code === "P1001" || code === "P1000" || /can't reach|cannot reach|econnrefused|enotfound|etimedout|connection.*(refused|terminated|closed)/i.test(msg)) {
    return "Falha ao conectar no banco: verifique DATABASE_URL na Vercel.";
  }
  if (/prisma\+postgres|accelerate|data proxy|prisma:\/\//i.test(msg)) {
    return "DATABASE_URL incompatível com o adapter pg (parece Prisma Accelerate). Use a connection string postgres:// direta.";
  }
  return "Erro interno ao autenticar. Veja os Runtime Logs da Vercel (auth.login_error).";
}

export async function POST(request: Request) {
  return withApi(async () => {
    assertSameOrigin(request);
    if (!checkRateLimit(`login:${requestIp(request)}`, 10, 15 * 60_000).allowed) throw new Error("RATE_LIMITED");
    const body = input.parse(await request.json());

    let user;
    try {
      user = await verifyOwnerCredentials(body.email, body.password);
    } catch (error) {
      log("error", "auth.login_error", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: describeLoginFailure(error) }, { status: 503 });
    }

    if (!user) return Response.json({ error: "Credenciais inválidas" }, { status: 401 });

    try {
      await createSession(user);
    } catch (error) {
      log("error", "auth.session_error", { error: error instanceof Error ? error.message : String(error) });
      return Response.json({ error: describeLoginFailure(error) }, { status: 503 });
    }
    return { ok: true };
  });
}
