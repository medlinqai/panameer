import { validatePhone } from "@/lib/phone";

/**
 * ONE PLACE WHERE FIELD FORMATS LIVE (`P1-J1.4-E299`).
 *
 * **SCOTT, 2026-08-31:** *"I added 6 numbers and tabbed out… i added an alpha and
 * tabbed out… didn't get an error. There has to be basic field edits (at least
 * when the country = USA)."*
 *
 * ── ⚠⚠ THE MODULE EXISTS SO THERE IS ONE COPY, NOT TWO ───────────────────────
 *
 * The ZIP rule shipped INLINE in `api/company/define/route.ts` as a
 * `superRefine`, and its message shipped a SECOND time as a bare literal in
 * `components/company/CompanyStep.tsx:523`. Two copies of a rule and two copies
 * of a sentence: the exact drift this module is for. ⚠ BOTH WERE **MOVED** HERE,
 * NOT COPIED — the route imports `usZip` and the component imports the same
 * message constant, and `check:field-quality` fails the build if either grows a
 * second implementation.
 *
 * ── ⚠ EVERY VALIDATOR RETURNS THE SAME SHAPE ─────────────────────────────────
 *
 * `{ ok, message?, normalised? }`. One shape means a caller never has to know
 * which field it is holding, and the client and the server necessarily print the
 * same sentence because there is only one.
 *
 * ── ⚠⚠ US RULES FIRE ONLY FOR US COUNTRIES ───────────────────────────────────
 *
 * A non-US company must never be told its postcode is malformed by a US rule.
 * `K1A 0B1` and `SW1A 1AA` are correct postcodes. Every validator here takes the
 * country and returns `ok` when it does not apply — an inapplicable rule is not
 * a failing rule.
 *
 * ── ⚠⚠ NO PHONE VALIDATOR WAS WRITTEN, AND THAT IS DELIBERATE ────────────────
 *
 * `lib/phone.ts` ALREADY DOES THIS — `ruleFor`, `digitsOf`, `formatPhone`,
 * `validatePhone`, `isPhoneComplete`, per-country rules, with `check:phone`
 * behind it. The brief said to write one ONLY if that file did not already cover
 * it. It does, so `usPhone` below is a THIN ADAPTER that calls `validatePhone`
 * and reshapes its answer. ⚠ NOT ONE CHARACTER OF PHONE LOGIC IS DUPLICATED, and
 * the harness asserts no second phone regex exists anywhere.
 */

export type FormatCheck = {
  ok: boolean;
  /** Present only when `ok` is false. THE one string for this failure. */
  message?: string;
  /** What should be stored. Present when the value needed cleaning up. */
  normalised?: string | null;
};

const OK: FormatCheck = { ok: true };

/**
 * ⚠ THE COUNTRY TEST, IN ONE PLACE.
 *
 * `COUNTRIES` stores full names, not ISO codes (`company.ts:29` — *"a full
 * country name from `COUNTRIES`, not an ISO code"*), so `"United States"` is the
 * value that actually arrives. The variants are accepted because form data and
 * imported data both exist and neither is worth a migration.
 */
const US_NAMES = new Set(["united states", "usa", "us", "united states of america"]);

export function isUnitedStates(country: string | null | undefined): boolean {
  return US_NAMES.has((country ?? "").trim().toLowerCase());
}

/* ────────────────────────────────────────────────────────────────────────────
   US ZIP — MOVED here from api/company/define/route.ts
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠ THE MESSAGE IS A CONSTANT SO THE CLIENT AND THE SERVER CANNOT DIVERGE.
 * ⚠ SUPERSEDED, quoted: this exact sentence was a literal in TWO files.
 */
export const US_ZIP_MESSAGE =
  "Enter a US ZIP code — 5 digits, or ZIP+4 as 12345-6789.";

const US_ZIP = /^\d{5}(-\d{4})?$/;

/**
 * ⚠ BLANK IS VALID. `E274` makes the company itself optional at onboarding, so a
 * part-answered company must still be savable — and this brief validates the
 * FORMAT of what was typed, never the presence of it.
 */
export function usZip(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const zip = (value ?? "").trim();
  if (!zip) return OK;
  if (!isUnitedStates(country)) return OK;
  if (!US_ZIP.test(zip)) return { ok: false, message: US_ZIP_MESSAGE };
  return { ok: true, normalised: zip };
}

/* ────────────────────────────────────────────────────────────────────────────
   EIN — the half that did not ship
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠ `ein` WAS `z.string().trim().max(40).nullish()` — FORTY CHARACTERS OF
 * ANYTHING. A length cap is not a format, which is the same defect the ZIP half
 * fixed for postcodes.
 */
export const EIN_MESSAGE =
  "Enter an EIN as 9 digits — 12-3456789, or 123456789 without the hyphen.";

/**
 * SHAPE ONLY. NINE DIGITS.
 *
 * ⚠⚠ THE PREFIX IS DELIBERATELY NOT VALIDATED. The IRS campus prefix list
 * changes, and a stale list in this repo would reject real companies — a
 * validator that is wrong about a live business is worse than no validator.
 *
 * ⚠⚠ EIN IS OPTIONAL AND STAYS OPTIONAL. A BLANK EIN IS VALID; a malformed one
 * is not. Scott's own rule from the entity-validation walk: *"US only, never
 * blocks."* Nothing in this module can make a field required — it has no way to
 * express that, on purpose.
 *
 * ⚠ STORED NORMALISED, WITH the hyphen: `Company.tin` is a display column read
 * straight onto screens, and one canonical form means two companies that typed
 * it differently do not read as different data.
 */
export function ein(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, normalised: null };
  if (!isUnitedStates(country)) return OK;
  const digits = raw.replace(/[^\d]/g, "");
  /* ⚠ Reject anything that was not just digits and a single hyphen in the right
     place — `12-345-6789` has nine digits and is not an EIN. */
  if (!/^\d{2}-?\d{7}$/.test(raw) || digits.length !== 9) {
    return { ok: false, message: EIN_MESSAGE };
  }
  return { ok: true, normalised: `${digits.slice(0, 2)}-${digits.slice(2)}` };
}

/* ────────────────────────────────────────────────────────────────────────────
   PHONE — an adapter over lib/phone.ts, never a second implementation
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠⚠ THE LOGIC IS `lib/phone.ts`'s AND STAYS THERE. This exists only so a caller
 * that already holds a `FormatCheck` does not need a second shape — it is four
 * lines of reshaping and contains no regex, no digit count and no country list
 * of its own. ⚠ `validatePhone` ALREADY RETURNS ITS OWN `reason` STRING, so even
 * the message is not re-authored here.
 */
export function usPhone(
  value: string | null | undefined,
  country: string | null | undefined
): FormatCheck {
  const raw = (value ?? "").trim();
  if (!raw) return OK;
  const r = validatePhone(raw, country ?? null);
  return r.ok ? { ok: true } : { ok: false, message: r.reason };
}

/** Everything this module validates, for the harness to enumerate. */
export const FIELD_FORMATS = { usZip, ein, usPhone } as const;
