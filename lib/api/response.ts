import { ZodError } from "zod";
import { log } from "@/lib/logger";
import { MetaApiError, recommendedMetaAction } from "@/lib/meta/errors";

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
  if (error instanceof MetaApiError) {
    log("warn", "api.meta_error", { error: error.message, code: error.code, subcode: error.subcode, httpStatus: error.httpStatus });
    const status = error.httpStatus >= 400 && error.httpStatus < 600 ? error.httpStatus : 502;
    return Response.json({ error: `Meta: ${error.userMessage || error.message}`, code: error.code, action: recommendedMetaAction(error) }, { status });
  }
  if (error instanceof Error && error.message.startsWith("Configur")) {
    return Response.json({ error: error.message }, { status: 400 });
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
