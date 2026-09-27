const SECRET_KEYS = /token|secret|password|authorization|cookie|evidence/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        SECRET_KEYS.test(key) ? "[REDACTED]" : redact(nested),
      ]),
    );
  }
  return value;
}

export function log(
  level: "debug" | "info" | "warn" | "error",
  event: string,
  context: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redact(context) as object,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}
