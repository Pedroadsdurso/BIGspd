import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyFromBase64(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY deve conter exatamente 32 bytes em base64.");
  }
  return key;
}

export function encryptSecret(plaintext: string, encodedKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFromBase64(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, encodedKey: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Formato de segredo criptografado inválido.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyFromBase64(encodedKey),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
