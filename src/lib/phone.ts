/**
 * Phone entry: digits only, formatted as you type, validated on blur (E203).
 *
 * THE FIELD ACCEPTED ANYTHING. It was a plain `type="tel"` box, which browsers
 * do not validate — "abc", "555", and a number with a trailing dash all sailed
 * through to a column the SMS verification will one day have to dial. The walk
 * typed letters into it and Continue took them.
 *
 * COUNTRY-AWARE, BECAUSE THE ADDRESS ALREADY ASKED. The location block sets the
 * country one field above this, and its hint already promised it "sets how we
 * format your phone number" — a promise nothing kept. A US provider now types
 * 2125599999 and sees (212) 559-9999.
 *
 * ── ⚠⚠ IT IS THE "ONE MODULE TO REPLACE", AND `P1-ALL-E417` REPLACED IT ──────
 *
 * ⚠ SUPERSEDED, quoted not deleted, the decision this reverses:
 *   *"NO LIBRARY. libphonenumber is ~150KB for a wizard field; the four
 *   countries Panameer actually onboards into have simple, stable national
 *   formats, and everywhere else falls back to a digit-count rule that cannot be
 *   wrong in an interesting way. If international dialling becomes a real
 *   surface, this is the one module to replace."*
 *
 * ⚠⚠ THE PREMISE EXPIRED: "everywhere else" now includes Scott's stated day-one
 * markets. India and all six GCC states hit that fallback, and it CAN be wrong
 * in an interesting way — it accepted `1234567` as an Indian number and, worse,
 * judged a nine-digit Saudi mobile against the ten-digit US rule and refused it.
 * ⚠ AND THE SIZE OBJECTION WAS ABOUT THE WRONG PACKAGE: `libphonenumber-js` with
 * its default `min` metadata is an order of magnitude smaller than the Java
 * original quoted above, it is offline, and it costs nothing per lookup — which
 * `CLAUDE.md` rule 9 requires of anything in a user path.
 *
 * ── ⚠ THE THREE CURATED MASKS STAY, AND THAT IS DELIBERATE ──────────────────
 *
 * US/Canada, the UK and Australia keep their hand-written formats below. The
 * library's national formats for those three DISAGREE with the shapes already
 * shipped — measured: `AsYouType('GB')` leaves `7700900123` unformatted where
 * this module renders `7700 900123`, and `AsYouType('AU')` leaves `412345678`
 * where this renders `4 1234 5678`. Those masks are pinned by `check:phone` and
 * are what Scott has walked, so the library supplies every OTHER country and
 * takes nothing away from these. ⚠ US is the one where the two agree exactly.
 *
 * ⚠⚠ FORMAT VALIDATION ONLY. This module answers "could this be a phone number
 * in that country" and nothing else. It does NOT verify possession — no SMS, no
 * OTP. Scott, 2026-09-12: *"Phone is expensive. not preferable at the start."*
 * See `user_levels.md`; possession is a separate, later decision.
 */

import {
  AsYouType,
  isValidPhoneNumber,
  validatePhoneNumberLength,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type PhoneRule = {
  /** ISO-ish country names as the address block spells them. */
  countries: string[];
  /** Digits in a complete national number, excluding the country code. */
  nationalDigits: number;
  countryCode: string;
  format: (digits: string) => string;
  example: string;
};

const NANP = (digits: string) => {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const RULES: PhoneRule[] = [
  {
    countries: ["United States", "USA", "US", "Canada", "CA"],
    nationalDigits: 10,
    countryCode: "1",
    format: NANP,
    example: "(212) 559-9999",
  },
  {
    countries: ["United Kingdom", "UK", "GB"],
    nationalDigits: 10,
    countryCode: "44",
    format: (digits) => {
      const d = digits.slice(0, 10);
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4)}`;
    },
    example: "7700 900123",
  },
  {
    countries: ["Australia", "AU"],
    nationalDigits: 9,
    countryCode: "61",
    format: (digits) => {
      const d = digits.slice(0, 9);
      if (d.length <= 1) return d;
      if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1)}`;
      return `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5)}`;
    },
    example: "4 1234 5678",
  },
];

/**
 * The generic fallback. E.164 allows 15 digits including the country code, and
 * no national number anywhere is shorter than 4 — so anything in that band is
 * accepted and left unformatted rather than pushed into a shape that might be
 * wrong for that country.
 *
 * ⚠ IT IS NOW THE LAST RESORT, NOT THE SECOND ONE (`P1-ALL-E417`). Before this
 * brief every country except three landed here. Now only a country with no ISO
 * code to hand does — in practice `"Other"`, and an empty country.
 */
const GENERIC = { min: 7, max: 15 };

/**
 * ⚠⚠ THE COUNTRY LIST SPEAKS DISPLAY NAMES; THE LIBRARY SPEAKS ISO 3166-1.
 *
 * `COUNTRIES` in `lib/countries.ts` stores "Saudi Arabia", and every caller
 * passes that string straight through from the address block or the sign-up
 * form. The library needs `"SA"`. This map is the whole translation layer, and
 * it is written out rather than derived because a wrong guess here is a silently
 * mis-validated number.
 *
 * ⚠ EVERY ENTRY IN `COUNTRIES` HAS A ROW, plus the short aliases the curated
 * rules below already accepted ("USA", "UK", "GB"...). `check:phone` asserts the
 * two lists have not drifted apart, so adding a country without its code fails
 * the build rather than quietly falling back to the generic band.
 * ⚠ `"Other"` HAS NO CODE ON PURPOSE — it is the escape hatch, not a country.
 */
const ISO: Record<string, CountryCode> = {
  "United States": "US", USA: "US", US: "US",
  Canada: "CA", CA: "CA",
  "United Kingdom": "GB", UK: "GB", GB: "GB",
  Ireland: "IE",
  Australia: "AU", AU: "AU",
  "New Zealand": "NZ",
  India: "IN",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Spain: "ES",
  Poland: "PL",
  Brazil: "BR",
  Mexico: "MX",
  Singapore: "SG",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  Qatar: "QA",
  Kuwait: "KW",
  Oman: "OM",
  Bahrain: "BH",
  "South Africa": "ZA",
};

/** The ISO 3166-1 alpha-2 code for a country as the address block spells it. */
export function isoFor(country: string | null | undefined): CountryCode | null {
  if (!country) return null;
  const exact = ISO[country.trim()];
  if (exact) return exact;
  const c = country.trim().toLowerCase();
  const hit = Object.keys(ISO).find((k) => k.toLowerCase() === c);
  return hit ? ISO[hit] : null;
}

/**
 * What we tell the person we are checking against — the honest version of the
 * hint that used to promise a format for countries this module had never heard
 * of. Returns the curated example where there is one, otherwise the dial code,
 * otherwise null so the caller says nothing rather than something false.
 */
export function phoneExpectation(
  country: string | null | undefined
): { example?: string; dialCode?: string; country: string } | null {
  if (!country) return null;
  const rule = ruleFor(country);
  if (rule) return { example: rule.example, dialCode: rule.countryCode, country };
  const iso = isoFor(country);
  if (!iso) return null;
  try {
    return { dialCode: getCountryCallingCode(iso), country };
  } catch {
    return null;
  }
}

export function ruleFor(country: string | null | undefined): PhoneRule | null {
  if (!country) return null;
  const c = country.trim().toLowerCase();
  return RULES.find((r) => r.countries.some((n) => n.toLowerCase() === c)) ?? null;
}

/** Everything that isn't a digit, gone. A leading + is not kept: the country
 *  picker supplies the country, so a typed prefix would double it. */
export function digitsOf(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * What the input should display for what has been typed so far.
 *
 * Formats INCREMENTALLY — "(212) 55" while mid-entry — because a mask that only
 * appears once the number is complete makes the field look broken until the
 * last keystroke. Never emits a trailing separator: "(212) " with nothing after
 * it invites someone to stop there and call it done.
 */
export function formatPhone(value: string, country: string | null | undefined): string {
  const digits = digitsOf(value);
  if (!digits) return "";
  const rule = ruleFor(country);
  if (rule) return rule.format(digits).replace(/[\s(-]+$/, "");

  /*
    ⚠ EVERY OTHER COUNTRY NOW GETS ITS REAL NATIONAL GROUPING (`P1-ALL-E417`) —
    an Indian mobile renders `98765 43210` where it used to render `9876543210`.
    ⚠ SUPERSEDED, quoted not deleted: `if (!rule) return digits.slice(0, GENERIC.max);`

    `AsYouType` is INCREMENTAL by design, which is the same contract the curated
    masks keep: a format that only appears on the last keystroke makes the field
    look broken until then.
    ⚠ THE TRAILING-SEPARATOR RULE APPLIES HERE TOO. The library will happily
    return "98765 " mid-entry, and a field that shows a dangling space invites
    someone to stop there — so the same trim runs on both paths.
  */
  const iso = isoFor(country);
  if (!iso) return digits.slice(0, GENERIC.max);
  const typed = new AsYouType(iso).input(digits.slice(0, GENERIC.max));
  return (typed || digits.slice(0, GENERIC.max)).replace(/[\s(-]+$/, "");
}

/**
 * ── ⚠⚠ HOW THE PHONE'S OWN COUNTRY IS PERSISTED (`P1-ALL-E417` WS-2a) ────────
 *
 * **SCOTT, 2026-09-12:** *"The selected phone country is stored with the phone,
 * independent of the address country — do not overwrite one from the other."*
 *
 * ⚠⚠ THERE IS NO `phone_country` COLUMN AND THIS BRIEF FORBIDS A `db:push`
 * (*"no `db:push` — if you think you need one, STOP"*). So the country is stored
 * INSIDE the number, in E.164: `+919876543210`. That satisfies the requirement
 * literally — the country travels with the phone, nothing derives it from the
 * address, and no schema moves. It is also what an international phone column
 * should hold.
 *
 * ⚠ THE INPUT STILL SHOWS THE NATIONAL FORM. `+91` lives in the picker beside
 * the field; the box reads `98765 43210`. Only the SAVED string is E.164.
 *
 * ⚠ LEGACY ROWS ARE NOT MIGRATED AND NOT REWRITTEN (`E164`). Numbers saved
 * before this brief are national text like `(212) 559-9999`; `parseStoredPhone`
 * returns `country: null` for them and the caller falls back to the sign-up
 * country, exactly as it did before. Nothing is back-filled.
 */
export function toE164(value: string, country: string | null | undefined): string | null {
  const digits = digitsOf(value);
  if (!digits) return null;
  const iso = isoFor(country);
  if (!iso) return null;
  const parsed = parsePhoneNumberFromString(digits, iso);
  return parsed?.isValid() ? parsed.number : null;
}

/**
 * Read a stored value back into the two things the field needs: which country
 * it belongs to, and what to show in the box.
 *
 * ⚠ TOLERANT BY DESIGN. A stored E.164 gives both answers; anything else — a
 * legacy national string, or a number typed before this field existed — gives
 * the digits back and `null` for the country, so the caller can fall back
 * rather than guess.
 */
export function parseStoredPhone(
  stored: string | null | undefined
): { country: string | null; display: string } {
  const raw = (stored ?? "").trim();
  if (!raw) return { country: null, display: "" };
  if (raw.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed?.country) {
      const name = Object.keys(ISO).find((k) => ISO[k] === parsed.country && k.length > 2);
      return {
        country: name ?? null,
        display: formatPhone(parsed.nationalNumber, name ?? null),
      };
    }
  }
  return { country: null, display: raw };
}

export type PhoneCheck = { ok: boolean; reason?: string };

/**
 * Blur-time validation.
 *
 * Deliberately reports WHAT IS WRONG rather than "invalid phone number": the
 * two real failures — letters, and a number that stops short — have different
 * fixes, and "incomplete" is the one people hit.
 */
export function validatePhone(
  value: string,
  country: string | null | undefined
): PhoneCheck {
  const raw = value.trim();
  if (!raw) return { ok: false, reason: "Add a phone number so buyers can reach you." };
  if (/[a-z]/i.test(raw)) return { ok: false, reason: "Numbers only, please." };

  const digits = digitsOf(raw);
  const rule = ruleFor(country);

  if (rule) {
    // A number typed with its country code — "1 212 559 9999" — is the same
    // number, so it is accepted rather than counted as too long.
    const national = digits.startsWith(rule.countryCode)
      ? digits.slice(rule.countryCode.length)
      : digits;
    if (national.length < rule.nationalDigits) {
      return { ok: false, reason: `That's too short — ${rule.example} is the shape we expect.` };
    }
    if (national.length > rule.nationalDigits) {
      return { ok: false, reason: `That's too long — ${rule.example} is the shape we expect.` };
    }
    return { ok: true };
  }

  /*
    ── ⚠⚠ EVERY OTHER COUNTRY, JUDGED BY ITS OWN RULES (`P1-ALL-E417`) ────────

    This is the half of the brief that matters: before it, India and all six GCC
    states fell to the digit band below, which accepted `1234567` as an Indian
    number. `isValidPhoneNumber` is the authority — measured, it accepts a real
    Indian mobile with or without the `91`/`0` prefix, accepts a Saudi mobile at
    nine digits with or without the leading `0`, and REFUSES a US number offered
    as a Saudi one.

    ⚠ LENGTH ONLY PICKS THE WORDS. `validatePhoneNumberLength` gives TOO_SHORT /
    TOO_LONG, which are the two failures people actually hit and the reason this
    function reports what is wrong instead of "invalid phone number". It is NOT
    the verdict: an eleven-digit Indian number returns no length complaint and is
    still not a valid number, so validity is asked separately.
    ⚠ THE COUNTRY IS NAMED IN THE REFUSAL. "That's too short" on a screen whose
    country the person cannot see is the defect this brief opened with.
  */
  const iso = isoFor(country);
  if (iso) {
    const lengthProblem = validatePhoneNumberLength(digits, iso);
    if (lengthProblem === "TOO_SHORT") {
      return { ok: false, reason: `That's too short for a ${country} number.` };
    }
    if (lengthProblem === "TOO_LONG") {
      return { ok: false, reason: `That's too long for a ${country} number.` };
    }
    /*
      ⚠ A NUMBER CAN BE THE RIGHT LENGTH AND STILL NOT EXIST — a Saudi number
      starting 21 is neither a mobile nor a landline there. The refusal says
      which country it was checked against, because the country came from the
      sign-up form or the address block and may simply be the wrong one.
    */
    if (!isValidPhoneNumber(digits, iso)) {
      return {
        ok: false,
        reason: `That doesn't look like a ${country} number. If you're somewhere else, change the country.`,
      };
    }
    return { ok: true };
  }

  /* ⚠ ONLY "Other" AND AN UNANSWERED COUNTRY REACH THIS NOW. */
  if (digits.length < GENERIC.min) return { ok: false, reason: "That number looks too short." };
  if (digits.length > GENERIC.max) return { ok: false, reason: "That number looks too long." };
  return { ok: true };
}

/** True when the field is complete enough to let Continue through. */
export function isPhoneComplete(
  value: string,
  country: string | null | undefined
): boolean {
  return validatePhone(value, country).ok;
}
