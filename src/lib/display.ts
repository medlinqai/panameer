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

/**
 * Basis points → a display percentage. 1490 bps = `"14.9%"`, 1000 bps = `"10%"`.
 *
 * ── ⚠⚠ THE TRAILING ZERO WAS A REAL BUG AND `E390` IS WHAT EXPOSED IT ───────
 *
 * ⚠ SUPERSEDED, quoted not deleted — this returned
 * `` `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%` ``, which rendered
 * **1490 as `"14.90%"`**. MEASURED BEFORE ANY CHANGE, not assumed.
 *
 * ⚠ IT WAS NEVER WRONG WHILE THE FEE WAS 10%: 1000 bps is an integer percentage,
 * so the `toFixed(2)` branch was unreachable for the only value that ever
 * reached it. **The fee moving to 14.9% is what made a two-decimal fallback
 * visible**, and `"14.90%"` is not what Scott decided or what the disclosure
 * should say.
 *
 * ⚠ TRAILING ZEROS ARE TRIMMED, SIGNIFICANT DIGITS ARE NOT: 1250 → `"12.5%"`,
 * 1005 → `"10.05%"`, 10 → `"0.1%"`. `check:service-fee` asserts each of those,
 * because "strip the zeros" written carelessly also strips the 5 from 10.05.
 */
export function bpsToPercentLabel(bps: number): string {
  const pct = bps / 100;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

/**
 * ── ⚠⚠ THE ONE PLACE THE DEFAULT FEE IS WRITTEN IN TYPESCRIPT ───────────────
 *
 * It MIRRORS `ProviderProfile.service_fee_bps @default(1490)` in the schema, and
 * that duplication is unavoidable — a Prisma `@default` is not readable from TS.
 * What IS avoidable is having it written THREE times, which is what was here
 * before `P1-J4-E388`: the schema, plus two literals in
 * `join/provider/page.tsx`. Two literals for one default WILL drift from the
 * schema, and the drift shows up as a provider being quoted one fee on screen
 * and charged another.
 *
 * ⚠⚠ THE DUPLICATION THAT REMAINS IS ASSERTED, NOT TRUSTED. `check:service-fee`
 * reads the `@default` out of `schema.prisma` as text and FAILS THE BUILD if it
 * and this constant differ. **That assertion is what stops the fourth copy** —
 * and it is the only thing that can, because no import can cross that boundary.
 *
 * ── ⚠⚠ 1490, AND EXISTING PROVIDERS ARE GRANDFATHERED ON PURPOSE (`E390`) ───
 *
 * **SCOTT, 2026-09-07:** *"Take it to 14.9%… I do not want to charge my customer
 * — removes a big NO. Providers will gladly pay to get work."*
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — this constant was `1000` and its docblock
 * said *"THE VALUE IS NOT CHANGED HERE… That is `E390`'s brief, NOT this one."*
 * `E390` is this change, and the reason it was held back is the reason the split
 * below is deliberate rather than an oversight.
 *
 * ⚠⚠ A PRISMA `@default` APPLIES ONLY ON INSERT. The 91 `ProviderProfile` rows
 * that existed on 2026-09-07 keep 1000 (10%) and every row created after it gets
 * 1490 (14.9%). **THAT IS THE DECISION, NOT AN ACCIDENT** — raising a live
 * provider's fee without telling them is not something a marketplace recovers
 * from. ⚠ DO NOT "FINISH THE JOB" WITH A BACKFILL: migrating existing providers
 * is its own decision and its own brief, and it needs `WorkOrder.fee_bps` (which
 * `E388` built) so an in-flight engagement finishes at the rate it was agreed
 * at. `check:service-fee` fails the build on any `UPDATE` over that column.
 *
 * ── ⚠⚠ THE "NEVER CHARGES THE BUYER" CLAIM IS DELETED, NOT REWORDED (`E396`) ─
 *
 * ⚠ SUPERSEDED, quoted not deleted: *"⚠ AND PANAMEER CHARGES THE PROVIDER ONLY.
 * There is no buyer-side fee anywhere in the schema or the code, and none is
 * being added."*
 *
 * ⚠⚠ THE SECOND HALF OF THAT SENTENCE IS STILL TRUE AND THE FIRST HALF IS NOT.
 * `check:service-fee` still asserts there is no buyer-fee column and no
 * `buyerFee` in the code, and both assertions pass — **that is a fact about the
 * SCHEMA.** What is no longer true is the marketing claim built on top of it:
 * `direct-contracts-terms` charges a Service Buyer a **$49/month Direct Work
 * Orders Fee**, and Scott has a **flat monthly buyer subscription** planned.
 *
 * ⚠ SCOTT'S DECISION WAS TO DELETE THE CLAIM RATHER THAN SOFTEN IT. The
 * accurate statement is that Panameer charges the buyer no COMMISSION — no
 * percentage of a transaction — which is a narrower thing than "no fee", and
 * narrowing it here in a code comment is not where that decision belongs.
 * ⚠⚠ NO REPLACEMENT CLAIM IS WRITTEN. Copy is Scott's.
 */
export const DEFAULT_SERVICE_FEE_BPS = 1490;

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
