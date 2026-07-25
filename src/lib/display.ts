/**
 * Display-formatting helpers (brief_P).
 *
 * Presentation only — these NEVER change what is stored. A provider's typed
 * name is their data; we re-case it for display so "scott" renders as "Scott"
 * (E006) without overwriting what they entered.
 */

/**
 * Capitalize a person's name for display (E006).
 *
 * Handles the shapes real names actually take: hyphenated ("mary-jane" →
 * "Mary-Jane"), apostrophes ("o'brien" → "O'Brien"), and multiple words. An
 * ALREADY-mixed-case name is left ALONE — "McDonald" and "van der Berg" are
 * deliberate, and lowercasing them to re-capitalize would mangle them.
 */
export function capitalizeName(raw: string | null | undefined): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  // Only normalize when the input carries no intentional casing (all-lower or
  // all-upper). Anything else is the user's own capitalization — respect it.
  const allOneCase = s === s.toLowerCase() || s === s.toUpperCase();
  if (!allOneCase) return s;
  return s
    .toLowerCase()
    .replace(/(^|[\s\-'’])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** First name for greetings — capitalized, first token only. */
export function displayFirstName(raw: string | null | undefined): string {
  return capitalizeName(raw).split(/\s+/)[0] ?? "";
}

/** "Scott Walls" from parts, each capitalized for display. */
export function displayFullName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return [capitalizeName(first), capitalizeName(last)].filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Money — integer cents only (E018, conventions). No floats anywhere.
// ---------------------------------------------------------------------------

/** "$125.00" from integer cents. */
export function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parse a typed dollar amount ("125", "125.50") to integer cents, or null. */
export function dollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** Integer cents → the string a dollar input should show ("125", "125.5"). */
export function centsToDollarInput(cents: number | null | undefined): string {
  return cents == null ? "" : String(cents / 100);
}

/** Basis points → a display percentage ("10%"). 1000 bps = 10%. */
export function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}

/**
 * The E018 rate breakdown, computed in integer cents end to end.
 * `fee` rounds to the nearest cent; `youGet` is the remainder, so the three
 * figures always reconcile exactly (rate = fee + youGet).
 */
export function rateBreakdown(
  hourlyCents: number | null | undefined,
  serviceFeeBps: number
): { rate: number | null; fee: number | null; youGet: number | null } {
  if (hourlyCents == null) return { rate: null, fee: null, youGet: null };
  const fee = Math.round((hourlyCents * serviceFeeBps) / 10_000);
  return { rate: hourlyCents, fee, youGet: hourlyCents - fee };
}
