import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

/**
 * ── ⚠⚠⚠ THE CANONICAL COUNTRY LIST (`P2-A1.1-E728` WS-B) ────────────────────────────────
 *
 * ⚠ **SCOTT'S RULING: *"One canonical list, stored as the ISO-2 code with the name displayed,
 * dial codes derived from libphonenumber-js (not typed)."***
 *
 * ── ⚠⚠⚠ NOTHING HERE IS TYPED OUT, AND THAT IS THE POINT ────────────────────────────────
 *
 * ⚠ **THE CODES COME FROM `libphonenumber-js` (245 of them)** and **THE NAMES COME FROM
 * `Intl.DisplayNames`**, which is in the platform. ⚠⚠ **SO A WRONG DIAL CODE OR A MISSPELLED
 * COUNTRY IS NOT A THING THIS REPO CAN CONTAIN** — there is no hand-maintained table to drift.
 * ⚠⚠⚠ **MEASURED BEFORE RELYING ON IT: of the 245 codes, ZERO have no English name.** A list
 * that silently rendered a bare code for some countries would be worse than a typed one.
 * ⚠ **AND IT IS THE SAME SOURCE THE PHONE VALIDATOR USES**, so a country the picker offers is
 * by construction a country the validator knows (`E585`).
 *
 * ⚠⚠ **THIS FILE REPLACES NOTHING YET.** `lib/countries.ts`'s 23-entry `COUNTRIES` is still
 * what the address form renders; readers move one at a time, which is Scott's ruling 1.
 */

/** ⚠ Built once. `Intl.DisplayNames` is not free and this list never changes at runtime. */
const DISPLAY = new Intl.DisplayNames(["en"], { type: "region" });

export type Country = { code: CountryCode; name: string; dial: string };

/** All 245, alphabetical by the name a member actually reads — not by code. */
export const ALL_COUNTRIES: readonly Country[] = getCountries()
  .map((code) => ({
    code,
    name: DISPLAY.of(code) ?? code,
    /* ⚠ DERIVED, NEVER TYPED — Scott's words. */
    dial: `+${getCountryCallingCode(code)}`,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const BY_CODE = new Map(ALL_COUNTRIES.map((c) => [c.code as string, c]));

/**
 * ── ⚠⚠⚠ THE ONE FUNCTION EVERY READER SWITCHES TO ───────────────────────────────────────
 *
 * ⚠ **IT PREFERS THE CODE AND FALLS BACK TO THE STORED NAME**, which is what makes Scott's
 * ruling 1 work: the code column is populated for 242 rows and null for 7, the name column is
 * untouched for all of them, and **a reader that calls this is correct in both worlds** — on a
 * migrated row and on a row whose code was never resolved.
 * ⚠⚠ **SO READERS CAN MOVE ONE AT A TIME WITH NO FLAG DAY.** That is the whole reason this
 * returns a string rather than throwing on a null code.
 * ⚠⚠⚠ **`"Other"` COMES BACK AS `"Other"`**, because that is what the row says and Scott ruled
 * it stays legal. The prompt to replace it is a notification, not a rewrite.
 */
export function countryName(
  code: string | null | undefined,
  storedName?: string | null
): string | null {
  if (code) {
    const hit = BY_CODE.get(code.toUpperCase());
    if (hit) return hit.name;
  }
  return storedName ?? null;
}

/** ⚠ The dial code for a stored ISO-2 code, or null. Derived, never typed. */
export function dialFor(code: string | null | undefined): string | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase())?.dial ?? null;
}

/** ⚠⚠ `"United States"` → `"US"`. Exact, then case-insensitive — the same two passes
 *  `isoFor` makes, so the two cannot disagree about a name. */
export function codeForName(name: string | null | undefined): CountryCode | null {
  if (!name) return null;
  const t = name.trim();
  const exact = ALL_COUNTRIES.find((c) => c.name === t);
  if (exact) return exact.code;
  const lower = t.toLowerCase();
  return ALL_COUNTRIES.find((c) => c.name.toLowerCase() === lower)?.code ?? null;
}
