/**
 * Phone masking + validation harness (E203). `npm run check:phone`.
 *
 * A pure module with a lot of small rules is exactly what these check scripts
 * are for: the failures worth catching here are off-by-one digit counts and a
 * mask that emits a trailing separator, and neither shows up by clicking once.
 */
import { readFileSync } from "node:fs";
import {
  formatPhone,
  validatePhone,
  isPhoneComplete,
  digitsOf,
  isoFor,
  toE164,
  parseStoredPhone,
} from "@/lib/phone";
import { COUNTRIES } from "@/lib/countries";

let passed = 0;
const failures: string[] = [];

function eq(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else failures.push(`${label}\n     expected ${JSON.stringify(expected)}\n     actual   ${JSON.stringify(actual)}`);
}

/* ---- digits ------------------------------------------------------------- */
eq("strips everything non-numeric", digitsOf("+1 (212) 559-9999"), "12125599999");
eq("letters are not digits", digitsOf("abc"), "");

/* ---- US masking, incrementally ------------------------------------------ */
eq("US 3 digits", formatPhone("212", "United States"), "212");
eq("US 4 digits", formatPhone("2125", "United States"), "(212) 5");
eq("US 6 digits", formatPhone("212559", "United States"), "(212) 559");
eq("US complete", formatPhone("2125599999", "United States"), "(212) 559-9999");
eq("US ignores junk", formatPhone("(212) 559-9999", "United States"), "(212) 559-9999");
eq("US truncates overflow", formatPhone("21255999991234", "United States"), "(212) 559-9999");
eq("Canada uses the same mask", formatPhone("4165551234", "Canada"), "(416) 555-1234");

/* NO TRAILING SEPARATOR — the bug this rule exists for. At exactly 3 digits
   the naive mask emits "(212) " and the field invites you to stop there. */
eq("no trailing space at 3", formatPhone("212", "United States").endsWith(" "), false);
eq("no trailing paren", formatPhone("21", "United States"), "21");
eq("no trailing dash at 6", formatPhone("212559", "United States").endsWith("-"), false);

/* ---- other countries ---------------------------------------------------- */
eq("UK groups 4+6", formatPhone("7700900123", "United Kingdom"), "7700 900123");
eq("AU groups 1+4+4", formatPhone("412345678", "Australia"), "4 1234 5678");
/*
  ⚠ RE-POINTED BY `P1-ALL-E417`, NOT LOOSENED. ⚠ SUPERSEDED, quoted not deleted:
      eq("unknown country is left as digits", formatPhone("+49 30 123456", "Germany"), "4930123456");
  Germany is not an unknown country any more — `libphonenumber-js` supplies its
  national grouping, which is the entire point of the change. The assertion moved
  to the new truth rather than being deleted, and a REAL unknown country is
  asserted below so the generic band keeps a test of its own.
*/
eq("Germany now groups properly", formatPhone("+49 30 123456", "Germany"), "49 30 123456");
eq("empty stays empty", formatPhone("", "United States"), "");

/* ---- ⚠⚠ THE DAY-ONE MARKETS (`P1-ALL-E417`) ----------------------------- */
/* India and the Gulf were the whole reason for the change: every one of these
   fell through to a 7–15 digit band that could not tell a phone number from a
   postcode. Formats are the library's national groupings, measured. */
eq("India groups 5+5", formatPhone("9876543210", "India"), "98765 43210");
eq("India complete passes", validatePhone("9876543210", "India").ok, true);
eq("India with the 91 prefix passes", validatePhone("91 98765 43210", "India").ok, true);
eq("India with a leading 0 passes", validatePhone("09876543210", "India").ok, true);
/* ⚠ THE CASE THE OLD GENERIC BAND ACCEPTED. Seven digits is a valid length
   somewhere, which is exactly why a band is not a rule. */
eq("India rejects a 7-digit number", validatePhone("1234567", "India").ok, false);
eq("India rejects an 11-digit number", validatePhone("98765432101", "India").ok, false);

eq("Saudi mobile passes at 9 digits", validatePhone("512345678", "Saudi Arabia").ok, true);
eq("Saudi with a leading 0 passes", validatePhone("0512345678", "Saudi Arabia").ok, true);
eq("Saudi with the 966 prefix passes", validatePhone("966512345678", "Saudi Arabia").ok, true);
/* ⚠⚠ THE HARD BLOCK THIS BRIEF EXISTS TO REMOVE, FROM BOTH SIDES: a Saudi
   number judged as a US one was refused for being "too short", and a US number
   offered as a Saudi one was accepted. Both are now correct. */
eq("a Saudi number is no longer 'too short'", validatePhone("512345678", "Saudi Arabia").reason, undefined);
eq("a US number is not a valid Saudi number", validatePhone("2125599999", "Saudi Arabia").ok, false);
eq("Saudi rejects a 5-digit number", validatePhone("12345", "Saudi Arabia").ok, false);

eq("Qatar passes", validatePhone("33123456", "Qatar").ok, true);
eq("Kuwait passes", validatePhone("50123456", "Kuwait").ok, true);
eq("Oman passes", validatePhone("92123456", "Oman").ok, true);
eq("Bahrain passes", validatePhone("36001234", "Bahrain").ok, true);
eq("UAE passes", validatePhone("501234567", "United Arab Emirates").ok, true);
/* ⚠ THE REFUSAL NAMES THE COUNTRY IT CHECKED AGAINST — the country comes from
   the sign-up form or the address block and may simply be the wrong one. */
eq(
  "the refusal names the country",
  validatePhone("12345", "Qatar").reason?.includes("Qatar"),
  true
);

/* ---- ⚠⚠ THE MAP MUST NOT DRIFT FROM THE COUNTRY LIST -------------------- */
/* `lib/phone.ts` translates display names to ISO codes by hand. A country added
   to `COUNTRIES` without a code would silently fall back to the generic band —
   which is the failure this whole brief is about — so it fails the build here. */
const missing = COUNTRIES.filter((c) => c !== "Other" && !isoFor(c));
eq(`every country has an ISO code (missing: ${missing.join(", ") || "none"})`, missing.length, 0);
eq("\"Other\" deliberately has none", isoFor("Other"), null);
eq("all six GCC states are mapped", [
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain",
].every((c) => isoFor(c) !== null), true);

/* ---- validation --------------------------------------------------------- */
eq("blank is rejected", validatePhone("", "United States").ok, false);
eq("letters are rejected", validatePhone("212-CALL-NOW", "United States").ok, false);
eq("letters say why", validatePhone("abcdefghij", "United States").reason, "Numbers only, please.");
eq("short is rejected", validatePhone("(212) 559-99", "United States").ok, false);
eq("complete US passes", validatePhone("(212) 559-9999", "United States").ok, true);
eq("US with country code passes", validatePhone("1 212 559 9999", "United States").ok, true);
eq("eleven digits without a 1 is too long", validatePhone("2125599999 7", "United States").ok, false);
eq("trailing separator still validates on its digits", validatePhone("(212) 559-9999-", "United States").ok, true);
eq("UK complete passes", validatePhone("7700 900123", "United Kingdom").ok, true);
eq("UK short fails", validatePhone("7700 9001", "United Kingdom").ok, false);
/*
  ── ⚠⚠ "UNKNOWN COUNTRY" NOW MEANS `"Other"`, NOT "not one of three" ────────

  ⚠ SUPERSEDED, quoted not deleted:
      eq("unknown country: 7 digits ok", validatePhone("1234567", "Germany").ok, true);
      eq("unknown country: 6 digits too short", validatePhone("123456", "Germany").ok, false);
      eq("unknown country: 16 digits too long", validatePhone("1234567890123456", "Germany").ok, false);

  ⚠ THE SECOND ONE WAS ASSERTING AN ARBITRARY BAND, AND `E417` CHECKED RATHER
  THAN ASSUMED: `isValidPhoneNumber("123456", "DE")` is TRUE in Google's data —
  German subscriber numbers are variable length and genuinely go that short. The
  old `GENERIC.min = 7` was a guess that happened to refuse a real number. It
  still guards the only case that has no better answer, which is a country with
  no ISO code at all.
*/
eq("Germany is judged by German rules now", validatePhone("3012345678", "Germany").ok, true);
eq("Germany: 16 digits is too long", validatePhone("1234567890123456", "Germany").ok, false);
eq("\"Other\": 7 digits ok", validatePhone("1234567", "Other").ok, true);
eq("\"Other\": 6 digits too short", validatePhone("123456", "Other").ok, false);
eq("\"Other\": 16 digits too long", validatePhone("1234567890123456", "Other").ok, false);
eq("\"Other\" is left as digits", formatPhone("+49 30 123456", "Other"), "4930123456");
eq("no country behaves generically", validatePhone("1234567", null).ok, true);

/* ---- ⚠⚠ E.164: THE COUNTRY TRAVELS WITH THE NUMBER (`E417` WS-2a) ------- */
/* Scott: "The selected phone country is stored with the phone, independent of
   the address country." There is no `phone_country` column and the brief forbids
   a db:push, so the country lives INSIDE the stored value. */
eq("India saves as E.164", toE164("98765 43210", "India"), "+919876543210");
eq("Saudi saves as E.164, leading 0 dropped", toE164("0512345678", "Saudi Arabia"), "+966512345678");
eq("US saves as E.164", toE164("(212) 559-9999", "United States"), "+12125599999");
eq("an invalid number has no E.164 form", toE164("12345", "India"), null);
eq("no country, no E.164", toE164("9876543210", null), null);

eq("a stored E.164 names its own country", parseStoredPhone("+919876543210"), {
  country: "India",
  display: "98765 43210",
});
eq("…and a Saudi one", parseStoredPhone("+966512345678").country, "Saudi Arabia");
/* ⚠ LEGACY ROWS ARE NOT MIGRATED (`E164`): a national string saved before this
   brief gives no country, and the caller falls back to the sign-up country. */
eq("a legacy national string yields no country", parseStoredPhone("(212) 559-9999"), {
  country: null,
  display: "(212) 559-9999",
});
eq("empty is empty", parseStoredPhone(null), { country: null, display: "" });
/* ⚠ ROUND TRIP — what is saved comes back as what was typed. */
eq(
  "round trip: type → save → reload → same display",
  parseStoredPhone(toE164("98765 43210", "India")).display,
  "98765 43210"
);

/* ---- ⚠⚠ THE FIELD IS NEVER JUDGED AGAINST AN UNKNOWN COUNTRY ------------ */
/*
  The brief's mutation: "make the country unavailable at type time → red". The
  country now comes from a control INSIDE the field, seeded from sign-up, so
  these assertions read the wiring — a pure unit test cannot see a prop.
  ⚠ THE REQUESTER WIZARD IS THE ONE THAT WAS BROKEN: phone is step 1, the
  address is step 2, and it validated against `draft.address.country`.
*/
const FIELD = readFileSync("src/components/onboarding/PhoneField.tsx", "utf8");
const REQ = readFileSync("src/app/join/requester/steps/page.tsx", "utf8");
const PROV = readFileSync("src/app/join/provider/page.tsx", "utf8");
const live = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

eq("the field carries its own country picker", /aria-label="Phone country"/.test(live(FIELD)), true);
eq("the picker is a select over COUNTRIES", /COUNTRIES\.filter/.test(live(FIELD)), true);
eq("changing country re-masks the number", /onChange\(formatPhone\(value, next\)\)/.test(live(FIELD)), true);
eq(
  "with no country selected the field says so rather than guessing",
  /Pick your country so we check the number/.test(FIELD),
  true
);
eq(
  "⚠⚠ the requester phone no longer reads the ADDRESS country",
  /phoneCountry\s*=\s*draft\.address\.country/.test(live(REQ)),
  false
);
eq("the requester field owns its country", /onCountryChange=\{setPhoneCountry\}/.test(live(REQ)), true);
eq("the requester saves E.164", /toE164\(draft\.phone, phoneCountry\)/.test(live(REQ)), true);
eq("the provider field owns its country too", /onCountryChange=\{setPhoneCountry\}/.test(live(PROV)), true);
eq(
  "the provider gate reads the PHONE's country, not the address's",
  /isPhoneComplete\(phoneInput, phoneCountry\)/.test(live(PROV)),
  true
);
eq("the provider saves E.164", /toE164\(phoneInput, phoneCountry\)/.test(live(PROV)), true);
eq(
  "⚠ no save path posts the raw input any more",
  /phone: phoneInput[,\s}]/.test(live(PROV)),
  false
);
/* ⚠ AND THE TWO COUNTRIES STAY INDEPENDENT — Scott: "do not overwrite one from
   the other." Nothing may re-point the phone country at the address country. */
eq(
  "⚠⚠ nothing overwrites the phone country from the address",
  /setPhoneCountry\((?!\(prev\) => prev \?\?)[^)]*addr\.country/.test(live(PROV)),
  false
);

/* ---- the gate the wizard actually calls --------------------------------- */
eq("isPhoneComplete mirrors validate", isPhoneComplete("(212) 559-9999", "United States"), true);
eq("isPhoneComplete blocks partials", isPhoneComplete("(212) 5", "United States"), false);

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
