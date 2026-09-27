import { ZodError } from "zod";
import { log } from "@/lib/logger";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json({ error: "Dados inválidos", issues: error.issues }, { status: 400 });
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "INVALID_ORIGIN") {
    return Response.json({ error: "Origem da requisição recusada" }, { status: 403 });
  }
  if (error instanceof Error && error.message === "RATE_LIMITED") {
    return Response.json({ error: "Muitas requisições" }, { status: 429 });
  }
  log("error", "api.unhandled_error", { error: error instanceof Error ? error.message : String(error) });
  return Response.json({ error: "Erro interno" }, { status: 500 });
}

export async function withApi<T>(handler: () => Promise<T | Response>) {
  try {
    const result = await handler();
    return result instanceof Response ? result : Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
