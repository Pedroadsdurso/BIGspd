export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly code?: number,
    public readonly subcode?: number,
    public readonly userTitle?: string,
    public readonly userMessage?: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export function parseMetaError(status: number, payload: unknown, retryAfter?: string | null) {
  const body = payload as { error?: { message?: string; code?: number; error_subcode?: number; error_user_title?: string; error_user_msg?: string } };
  const error = body?.error;
  const retry = retryAfter ? Number(retryAfter) : undefined;
  return new MetaApiError(
    error?.message || `Meta Graph API respondeu HTTP ${status}`,
    status,
    error?.code,
    error?.error_subcode,
    error?.error_user_title,
    error?.error_user_msg,
    Number.isFinite(retry) ? retry : undefined,
  );
}

/**
 * Erros que valem para a conta inteira (pagamento, token, conta bloqueada,
 * número não registrado): continuar enviando só queimaria a lista.
 */
export const ACCOUNT_BLOCKING_CODES = new Set([190, 131031, 131042, 133010]);

export function isAccountBlockingError(code?: number | string | null) {
  return code != null && ACCOUNT_BLOCKING_CODES.has(Number(code));
}

export function recommendedMetaAction(error: MetaApiError) {
  if (error.httpStatus === 401 || error.code === 190) return "Renove o token e confirme as permissões do aplicativo.";
  if (error.httpStatus === 429 || error.code === 80007) return "Aguarde o Retry-After; o worker tentará novamente com backoff.";
  if (error.code === 131047) return "Use um template aprovado fora da janela de atendimento.";
  if (error.code === 131026) return "Confirme o número do destinatário e se ele pode receber mensagens no WhatsApp.";
  return "Consulte o código na documentação da Meta e valide WABA, número e template.";
}
