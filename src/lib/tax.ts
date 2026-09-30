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
/* ⚠ THE ONE RESOLVER (`E729` WS-C ruling 3). */
import { isUnitedStatesCountry } from "@/lib/country";

export type TaxFormCode = "W9" | "W8BEN" | "W8BENE";

export const US_COUNTRIES = new Set([
  "United States",
  "United States of America",
  "USA",
  "US",
]);

/**
 * ── ⚠⚠⚠ IT READS THE CODE AND IGNORES CASE (`P2-A1.1-E729` WS-C, ruling 3) ──────────────
 *
 * ⚠ **SCOTT: *"`isUnitedStates` reads the code and ignores case. Prove W-9 vs W-8 for a US
 * and a non-US persona."***
 * ⚠⚠⚠ **THIS IS THE HIGHEST-CONSEQUENCE COUNTRY READ IN THE APP — IT DECIDES W-9 vs W-8.**
 * The old body was `US_COUNTRIES.has(country.trim())`: a **case-SENSITIVE** `Set` of four
 * spellings. `"US"` passed and **`"us"` did not**, so a lower-cased code would have handed a
 * US taxpayer a W-8BEN — a form for foreign persons — on a printable tax document.
 * ⚠⚠ **`countryColumns` RESOLVES NAME, CODE AND CASING TO ONE ANSWER**, so every spelling
 * that means the United States now reaches the same verdict, and there is one definition of
 * "is this the US" rather than a `Set` that had to be remembered (`E585`).
 * ⚠ `US_COUNTRIES` IS KEPT AND EXPORTED — `check:field-quality` asserts against the old
 * spellings, and removing it would take that assertion with it (standing rule: before
 * deleting dead code, check whether a gate asserts a live rule against it).
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   export function isUnitedStates(country: string): boolean {
 * //     return US_COUNTRIES.has(country.trim());
 * //   }
 */
export function isUnitedStates(country: string): boolean {
  return isUnitedStatesCountry(country);
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
