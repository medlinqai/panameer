/**
 * Phone masking + validation harness (E203). `npm run check:phone`.
 *
 * A pure module with a lot of small rules is exactly what these check scripts
 * are for: the failures worth catching here are off-by-one digit counts and a
 * mask that emits a trailing separator, and neither shows up by clicking once.
 */
import { formatPhone, validatePhone, isPhoneComplete, digitsOf } from "@/lib/phone";

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
eq("unknown country is left as digits", formatPhone("+49 30 123456", "Germany"), "4930123456");
eq("empty stays empty", formatPhone("", "United States"), "");

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
eq("unknown country: 7 digits ok", validatePhone("1234567", "Germany").ok, true);
eq("unknown country: 6 digits too short", validatePhone("123456", "Germany").ok, false);
eq("unknown country: 16 digits too long", validatePhone("1234567890123456", "Germany").ok, false);
eq("no country behaves generically", validatePhone("1234567", null).ok, true);

/* ---- the gate the wizard actually calls --------------------------------- */
eq("isPhoneComplete mirrors validate", isPhoneComplete("(212) 559-9999", "United States"), true);
eq("isPhoneComplete blocks partials", isPhoneComplete("(212) 5", "United States"), false);

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}\n`);
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
