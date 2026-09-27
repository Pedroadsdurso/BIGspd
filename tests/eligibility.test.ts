import { describe, expect, it } from "vitest";
import { isEligibleForCampaign } from "@/lib/campaigns/eligibility";
const base = { phone: "5511999999999", phoneStatus: "VALID" as const, consentStatus: "OPTED_IN" as const, optOut: false };
describe("elegibilidade", () => {
  it("aceita contato consentido", () => expect(isEligibleForCampaign(base, { category: "MARKETING" }).eligible).toBe(true));
  it("bloqueia marketing sem consentimento", () => expect(isEligibleForCampaign({ ...base, consentStatus: "UNKNOWN" }, { category: "MARKETING" }).reasons).toContain("CONSENT_REQUIRED"));
  it("bloqueia opt-out e suppression", () => expect(isEligibleForCampaign({ ...base, optOut: true, suppressed: true }, { category: "UTILITY" }).reasons).toEqual(expect.arrayContaining(["OPT_OUT", "SUPPRESSION"])));
  it("bloqueia telefone inválido", () => expect(isEligibleForCampaign({ ...base, phoneStatus: "INVALID_PHONE" }, { category: "UTILITY" }).eligible).toBe(false));
});
