const required = [
  "DATABASE_URL",
  "REDIS_URL",
  "APP_URL",
  "AUTH_SECRET",
  "OWNER_EMAIL",
  "SETTINGS_ENCRYPTION_KEY",
] as const;

const failures: string[] = [];

for (const key of required) {
  if (!process.env[key]?.trim()) failures.push(`${key} não foi definido.`);
}

if (!process.env.OWNER_PASSWORD_HASH?.trim() && !process.env.OWNER_PASSWORD?.trim()) {
  failures.push("Defina OWNER_PASSWORD_HASH ou OWNER_PASSWORD.");
}

if (process.env.META_CLIENT_MODE !== "live") {
  failures.push("META_CLIENT_MODE deve ser live para produção.");
}

try {
  const url = new URL(process.env.APP_URL || "");
  if (url.protocol !== "https:") failures.push("APP_URL deve usar HTTPS.");
  if (["localhost", "127.0.0.1"].includes(url.hostname)) failures.push("APP_URL não pode apontar para localhost.");
} catch {
  failures.push("APP_URL não é uma URL válida.");
}

if ((process.env.AUTH_SECRET || "").length < 32) {
  failures.push("AUTH_SECRET deve ter pelo menos 32 caracteres.");
}

try {
  if (Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY || "", "base64").length !== 32) {
    failures.push("SETTINGS_ENCRYPTION_KEY deve representar exatamente 32 bytes em base64.");
  }
} catch {
  failures.push("SETTINGS_ENCRYPTION_KEY não é base64 válido.");
}

if (failures.length) {
  console.error("Configuração de produção inválida:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Configuração de produção válida. Nenhum segredo foi exibido.");
