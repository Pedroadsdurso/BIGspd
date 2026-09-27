export type PhoneNormalization =
  | { status: "VALID"; phone: string }
  | { status: "INVALID_PHONE"; phone: null; raw: string };

export function normalizePhone(raw: unknown, defaultCountryCode = "55"): PhoneNormalization {
  const original = String(raw ?? "").trim();
  if (!original) return { status: "INVALID_PHONE", phone: null, raw: original };

  const hadPlus = original.startsWith("+");
  let digits = original.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!hadPlus && !digits.startsWith(defaultCountryCode)) digits = `${defaultCountryCode}${digits}`;

  if (digits.length < 8 || digits.length > 15 || /^0+$/.test(digits)) {
    return { status: "INVALID_PHONE", phone: null, raw: original };
  }
  return { status: "VALID", phone: digits };
}
