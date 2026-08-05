/**
 * Which tax form a payee must file (J2.4 WS-H / E017).
 *
 * JURISDICTION DECIDES, NOT THE USER. A W-9 is for a US person and a W-8 is for
 * everyone else; offering it as a dropdown invites the wrong answer and the
 * wrong answer here has consequences for both parties. So the form follows the
 * payout country, and the UI states which one applies rather than asking.
 *
 * W-8BEN vs W-8BEN-E is individual vs entity — the one genuine choice, because
 * a recruiter being paid through a company files differently from a person.
 */
export type TaxFormCode = "W9" | "W8BEN" | "W8BENE";

export const US_COUNTRIES = new Set([
  "United States",
  "United States of America",
  "USA",
  "US",
]);

export function isUnitedStates(country: string): boolean {
  return US_COUNTRIES.has(country.trim());
}

export function formFor(country: string, asEntity: boolean): TaxFormCode {
  if (isUnitedStates(country)) return "W9";
  return asEntity ? "W8BENE" : "W8BEN";
}

export const FORM_LABEL: Record<TaxFormCode, string> = {
  W9: "Form W-9",
  W8BEN: "Form W-8BEN",
  W8BENE: "Form W-8BEN-E",
};

export const FORM_BLURB: Record<TaxFormCode, string> = {
  W9: "US taxpayers certify their name and taxpayer ID so Panameer can report payments correctly.",
  W8BEN:
    "Non-US individuals certify they're not a US taxpayer, so US withholding isn't applied in error.",
  W8BENE:
    "Non-US entities — a company being paid rather than a person — certify the same thing.",
};
