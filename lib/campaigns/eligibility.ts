export type EligibilityContact = {
  phone: string;
  phoneStatus: "VALID" | "INVALID_PHONE";
  consentStatus: "UNKNOWN" | "OPTED_IN" | "OPTED_OUT";
  optOut: boolean;
  suppressed?: boolean;
};

export type EligibilityCampaign = {
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | "UNKNOWN";
  requireExplicitConsent?: boolean;
};

export function isEligibleForCampaign(contact: EligibilityContact, campaign: EligibilityCampaign) {
  const reasons: string[] = [];
  if (contact.phoneStatus !== "VALID" || !/^\d{8,15}$/.test(contact.phone)) reasons.push("INVALID_PHONE");
  if (contact.optOut || contact.consentStatus === "OPTED_OUT") reasons.push("OPT_OUT");
  if (contact.suppressed) reasons.push("SUPPRESSION");

  const requiresConsent = campaign.requireExplicitConsent ?? campaign.category === "MARKETING";
  if (requiresConsent && contact.consentStatus !== "OPTED_IN") reasons.push("CONSENT_REQUIRED");

  return { eligible: reasons.length === 0, reasons };
}
