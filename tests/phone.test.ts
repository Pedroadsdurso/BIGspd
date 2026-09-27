import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/contacts/phone";

describe("normalizePhone", () => {
  it("normaliza número brasileiro local", () => expect(normalizePhone("(11) 99999-9999")).toEqual({ status: "VALID", phone: "5511999999999" }));
  it("preserva número com código internacional", () => expect(normalizePhone("+1 (212) 555-0100", "55")).toEqual({ status: "VALID", phone: "12125550100" }));
  it("não inventa número ausente", () => expect(normalizePhone("").status).toBe("INVALID_PHONE"));
  it("recusa comprimentos impossíveis", () => expect(normalizePhone("123", "55").status).toBe("INVALID_PHONE"));
});
