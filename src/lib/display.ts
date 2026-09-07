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
 * ── ⚠⚠ THE ONE PLACE THE DEFAULT FEE IS WRITTEN IN TYPESCRIPT (`P1-J4-E388`) ──
 *
 * It MIRRORS `ProviderProfile.service_fee_bps @default(1000)` in the schema, and
 * that duplication is unavoidable — a Prisma `@default` is not readable from TS.
 * What IS avoidable is having it written THREE times, which is what was here:
 * the schema, plus `join/provider/page.tsx:445` (`serviceFeeBps: 1000`) and
 * `:663` (`p.serviceFeeBps ?? 1000`). Two literals for one default WILL drift
 * from the schema, and the drift would show up as a provider being quoted one
 * fee on screen and charged another.
 *
 * ⚠⚠ THE VALUE IS **NOT** CHANGED HERE. The code says 10%; Scott has decided
 * 14.9% (Amendment 14). That is `E390`'s brief, NOT this one, and the reason it
 * is not a one-line edit is that a Prisma `@default` APPLIES ONLY ON INSERT:
 * flipping 1000 → 1490 would leave all 91 existing providers on 10% and put
 * every new one on 14.9% — a two-tier marketplace nobody decided to create, with
 * neither group told. Routing the literals through here is what makes that later
 * change ONE decision instead of a hunt.
 */
export const DEFAULT_SERVICE_FEE_BPS = 1000;

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
