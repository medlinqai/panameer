/**
 * THE TAX ID — the half of validation Panameer can actually do (`P1-ALL-E404` WS-2).
 *
 * ── ⚠⚠ IRS TIN MATCHING IS NOT AVAILABLE TO PANAMEER, AND THAT IS NOT A BUG ──
 *
 * Eligibility for the IRS TIN Matching programme requires being listed in the
 * **Payer Account File**, which requires having filed Forms 1099 **within the
 * last two years**. Panameer has filed none. There is also no public API — the
 * service is interactive or bulk through e-Services, with results returned to a
 * secure mailbox. ⚠ So the authoritative half CANNOT be built today, and the
 * honest answer for it is `unchecked` — never `match`.
 *
 * ⚠⚠ A FORMAT PASS IS NOT A VERIFIED TIN. That confusion is the whole failure
 * this invites: a company whose number is well-formed and simply *not theirs*
 * looks identical to a verified one. The result type below keeps the two facts
 * in separate fields so no caller can collapse them by accident, and
 * `check:tin` fails the build if one tries.
 *
 * ── THE SHAPE, SO A REAL MATCHER DROPS IN LATER ───────────────────────────
 *
 * One entry point (`checkTin`), one result (`TinCheck`). When Panameer becomes
 * eligible, the only change is `irs.status` starting to return `match` /
 * `no-match` — no caller, no column and no screen has to move.
 */

/**
 * ── ⚠ THE VALID EIN PREFIXES — FETCHED, NOT RECALLED ──────────────────────
 *
 * Source: **IRS, "How EINs are Assigned and Valid EIN Prefixes"**
 * `https://www.irs.gov/businesses/small-businesses-self-employed/how-eins-are-assigned-and-valid-ein-prefixes`
 * — retrieved 2026-09-09; the page's own marker reads *"Page Last Reviewed or
 * Updated: 09-Apr-2026"*. The 83 values below are the union of every campus row
 * on that page (Andover, Atlanta, Austin, Brookhaven, Cincinnati, Fresno, Kansas
 * City, Memphis, Ogden, Philadelphia, Internet, and SBA).
 *
 * ⚠⚠ THE FIRST TWO DIGITS ENCODE WHO ISSUED THE EIN, AND THE LIST GROWS. The IRS
 * adds prefixes as it opens issuing channels — "Internet" (20, 26, 27, …) did not
 * exist before online applications. **A STALE LIST REJECTS A REAL COMPANY**, which
 * is why an unrecognised prefix is its own outcome below and NOT a hard failure.
 */
export const IRS_EIN_PREFIXES: ReadonlySet<string> = new Set([
  "01", "02", "03", "04", "05", "06", "10", "11", "12", "13", "14", "15", "16",
  "20", "21", "22", "23", "24", "25", "26", "27", "30", "31", "32", "33", "34",
  "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47",
  "48", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61",
  "62", "63", "64", "65", "66", "67", "68", "71", "72", "73", "74", "75", "76",
  "77", "80", "81", "82", "83", "84", "85", "86", "87", "88", "90", "91", "92",
  "93", "94", "95", "98", "99",
]);

/**
 * ⚠ WHICH NUMBER THE PAYEE IS GIVING US, AND THE FORM MUST ASK.
 *
 * A sole proprietor may legitimately supply an **SSN** — Form W-9 says so
 * explicitly. Validating an SSN against EIN rules rejects a real person, and
 * validating an EIN against SSN rules rejects a real company. The two have
 * different impossible values, so the kind cannot be guessed from the digits.
 */
export type TinKind = "EIN" | "SSN";

export type TinFormat =
  /** Nine digits, a recognised prefix, and no impossible component. */
  | "VALID"
  /** Not nine digits, or contains something that is not a digit or separator. */
  | "MALFORMED"
  /** Well-formed and cannot exist — `00-0000000`, SSN area 000/666/9xx, etc. */
  | "IMPOSSIBLE"
  /** ⚠ EIN only: nine digits, but the prefix is not on the IRS list we hold. */
  | "UNKNOWN_PREFIX";

/**
 * ⚠⚠ THE AUTHORITATIVE HALF, AND IT IS ALWAYS `unchecked` TODAY. `match` means
 * the IRS confirmed this name/TIN pair. Nothing in this codebase can produce it,
 * and `check:tin` asserts that nothing claims to.
 */
export type TinMatchStatus = "match" | "no-match" | "unchecked";

export type TinCheck = {
  kind: TinKind;
  format: TinFormat;
  /** `true` only for `VALID`. ⚠ NOT a statement that the number is the payee's. */
  formatOk: boolean;
  irs: { status: TinMatchStatus; reason: string };
  /** ⚠ Safe to render, log or store alongside. Never the full value. */
  masked: string;
};

/** Digits only — the payee may type dashes, spaces, or neither. */
const digitsOf = (raw: string) => raw.replace(/[\s-]/g, "");

/**
 * ⚠ MASKED TO THE LAST FOUR, and this is the ONLY form of a TIN that may leave
 * this module for a screen, a log line or an error message. An empty or short
 * value masks to `••••` rather than leaking what little there is.
 */
export function maskTin(raw: string | null | undefined): string {
  const d = digitsOf(raw ?? "").replace(/\D/g, "");
  return d.length < 4 ? "••••" : `•••••${d.slice(-4)}`;
}

/**
 * Check a tax id. ⚠ THE CALLER MUST SAY WHICH KIND IT IS — see `TinKind`.
 *
 * ⚠⚠ THIS FUNCTION NEVER THROWS AND NEVER ECHOES THE INPUT. A validation error
 * that quotes the value it rejected puts a TIN into an error string, and error
 * strings reach logs, Sentry and the browser console. Every message below is
 * constant text; the only variable part is `masked`.
 */
export function checkTin(raw: string, kind: TinKind): TinCheck {
  const d = digitsOf(raw ?? "");
  const masked = maskTin(d);
  const unchecked = {
    status: "unchecked" as const,
    reason:
      "Panameer is not enrolled in IRS TIN Matching — enrolment requires having filed Forms 1099 in the last two years, and Panameer has filed none.",
  };
  const out = (format: TinFormat): TinCheck => ({
    kind,
    format,
    formatOk: format === "VALID",
    irs: unchecked,
    masked,
  });

  if (!/^\d{9}$/.test(d)) return out("MALFORMED");

  /* ⚠ THE RULE THE BRIEF NAMES: well-formed is not the same as possible.
     `00-0000000` passes every length and character test and cannot exist. */
  if (/^(\d)\1{8}$/.test(d)) return out("IMPOSSIBLE");

  if (kind === "EIN") {
    const prefix = d.slice(0, 2);
    if (prefix === "00") return out("IMPOSSIBLE");
    /* ⚠⚠ NOT A HARD FAILURE — see `IRS_EIN_PREFIXES`. The IRS adds prefixes, and
       a list that has gone stale would reject a real, newly-issued EIN. The
       caller decides whether to warn or block; the validator refuses to pretend
       it knows. */
    if (!IRS_EIN_PREFIXES.has(prefix)) return out("UNKNOWN_PREFIX");
    return out("VALID");
  }

  /* SSN — the impossible ranges are the SSA's own, and they are different from
     an EIN's. Area 000, 666 and 900–999 are never issued; group 00 and serial
     0000 are never issued. */
  const area = d.slice(0, 3);
  const group = d.slice(3, 5);
  const serial = d.slice(5);
  if (area === "000" || area === "666" || area[0] === "9") return out("IMPOSSIBLE");
  if (group === "00" || serial === "0000") return out("IMPOSSIBLE");
  return out("VALID");
}

/**
 * ⚠ A SENTENCE A PERSON CAN ACT ON, carrying no digits.
 *
 * ⚠⚠ IT NEVER SAYS "VERIFIED". The most it can say about a passing number is
 * that it *looks* right, because that is the most that is known.
 */
export function tinFormatMessage(c: TinCheck): string {
  switch (c.format) {
    case "VALID":
      return c.kind === "EIN"
        ? "That looks like a valid EIN format. We have not confirmed it with the IRS."
        : "That looks like a valid SSN format. We have not confirmed it with the IRS.";
    case "MALFORMED":
      return "A tax ID is nine digits. Dashes and spaces are fine.";
    case "IMPOSSIBLE":
      return "That is nine digits, but it is not a number the IRS issues.";
    case "UNKNOWN_PREFIX":
      return "We do not recognise the first two digits of that EIN. Please double-check them — if they are right, continue and we will review it.";
  }
}
