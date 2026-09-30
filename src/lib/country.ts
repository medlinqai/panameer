import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
/* ⚠ FOR ITS ALIAS MAP ONLY — `"USA"`, `"UK"` and friends (`E729` WS-C). */
import { isoFor } from "@/lib/phone";

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
 * ── ⚠⚠ THIS FILE IS NOW THE LIST AND THE BOUNDARY (`E729` WS-C) ─────────────────────────
 *
 * ⚠ **EVERY PICKER RENDERS `ALL_COUNTRIES` AND EVERY WRITER GOES THROUGH `countryColumns`.**
 * The address form, sign-up, the company step and the phone field all read from here; the ten
 * write sites resolve here. ⚠⚠ **`lib/countries.ts`'s 23-entry `COUNTRIES` SURVIVES FOR ONE
 * REASON ONLY — `check:phone`'s coverage assertion walks it** (every entry must resolve to a
 * code); nothing renders it. ⚠ **`COUNTRY_REGIONS` in that file is live and is keyed by CODE.**
 * ⚠ **SUPERSEDED, quoted not deleted (`E164`):**
 * //   THIS FILE REPLACES NOTHING YET. lib/countries.ts's 23-entry COUNTRIES is still
 * //   what the address form renders; readers move one at a time, which is Scott's ruling 1.
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

/**
 * ── ⚠⚠⚠ THE ONE WRITE BOUNDARY (`P2-A1.1-E729` WS-C) ────────────────────────────────────
 *
 * ⚠ **THE PICKER NOW STORES A CODE, AND EVERY WRITER GOES THROUGH HERE.**
 *
 * ⚠⚠⚠ **IT WRITES BOTH COLUMNS, AND THAT IS THE WHOLE DESIGN.** `WS-B` put a code column
 * beside each name column and left the names untouched so readers could move one at a time.
 * **If the picker started writing codes into `country`, that column would hold names for old
 * rows and codes for new ones** — and every reader not yet switched would print `US` to a
 * member. ⚠⚠ So the code goes to `country_code`, the RESOLVED NAME goes to `country`, and the
 * name column stays exactly what it has always been: a country name.
 * ⚠ **THAT ALSO MEANS THE MIGRATION NEVER HAS TO FINISH IN A HURRY.** A reader switched in
 * three briefs' time is correct either way, and one never switched is correct too.
 *
 * ⚠⚠ **IT ACCEPTS A NAME AS WELL AS A CODE**, because not every caller is a picker: the AI
 * job-import writes whatever the posting said, and the sign-up API is a bare `z.string()`.
 * **A value it cannot resolve is passed through to `country` with a null code** — the same
 * shape `"Other"` takes, and the reason the code column is nullable.
 */
export function countryColumns(
  input: string | null | undefined
): { country: string | null; country_code: string | null } {
  const raw = input?.trim();
  if (!raw) return { country: null, country_code: null };
  /* ⚠ A code first — the picker is the common caller and sends two characters. */
  const asCode = BY_CODE.get(raw.toUpperCase());
  if (asCode) return { country: asCode.name, country_code: asCode.code };
  /* ⚠⚠ THEN A NAME, so an older client or an API caller still resolves. */
  const asName = codeForName(raw);
  if (asName) return { country: BY_CODE.get(asName)!.name, country_code: asName };
  /*
    ── ⚠⚠⚠ THEN THE ALIASES, AND THIS ONE WAS CAUGHT BY A GATE ─────────────────────────

    ⚠ `Intl.DisplayNames` knows `"United States"`. **IT DOES NOT KNOW `"USA"` OR `"United
    States of America"`** — and `lib/tax.ts`'s old `US_COUNTRIES` Set did, which is why
    `check:country` caught `formFor("USA")` returning **W8BEN**: a US taxpayer handed a form
    for foreign persons.
    ⚠⚠ **`isoFor` ALREADY HOLDS THOSE ALIASES** (`USA`, `UK`, and the rest of its hand map),
    so this defers to it rather than starting a second alias table (`E585`). **The knowledge
    was already in the repo; it just was not being asked.**
  */
  const viaAlias = isoFor(raw);
  if (viaAlias) {
    const hit = BY_CODE.get(viaAlias);
    if (hit) return { country: hit.name, country_code: hit.code };
  }
  /* ⚠⚠⚠ AND `"Other"` — OR ANYTHING ELSE — SURVIVES VERBATIM WITH NO CODE. Ruling 2 of WS-B:
     the null IS the flag, and refusing the value would lock somebody out of their own form. */
  return { country: raw, country_code: null };
}

/**
 * ⚠⚠ Is this the United States? **READS THE CODE AND IGNORES CASE** (`E729` ruling 3).
 *
 * ⚠⚠⚠ **IT DECIDES W-9 vs W-8, so it is the highest-consequence country read in the app.**
 * `lib/tax.ts`'s version was a case-SENSITIVE `Set` of four spellings — `"US"` passed, `"us"`
 * did not, and a lower-cased code would have handed a US taxpayer a W-8. ⚠ This resolves the
 * value first, so a name, a code, and any casing of either all reach the same answer.
 */
export function isUnitedStatesCountry(value: string | null | undefined): boolean {
  return countryColumns(value).country_code === "US";
}
