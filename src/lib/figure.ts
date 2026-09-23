/**
 * ── ⚠⚠⚠ THE PURE HALF OF THE STATISTICS MODULE (`P2-A2-E603` WS-B) ───────
 *
 * ⚠⚠⚠ THIS FILE EXISTS BECAUSE A CLIENT COMPONENT CANNOT IMPORT PRISMA, AND
 * THE BUILD IS THE ONLY THING THAT SAYS SO.
 * ⚠ `Honeycomb.tsx` is `"use client"` and needs `Figure` and `isCounted`. Those
 * lived in `lib/statistics.ts`, which imports `@/lib/prisma` — so importing one
 * helper dragged **`pg` into the browser bundle** and the build failed with
 * `Module not found: Can't resolve 'dns'`.
 * ⚠⚠ `tsc` WAS GREEN THROUGHOUT. A type-only concern and a bundling concern are
 * different concerns, and only `next build` can see the second.
 *
 * ⚠⚠ SO THE RULE-CARRYING TYPE AND ITS PURE HELPERS LIVE HERE, WITH NO
 * IMPORTS AT ALL, and `lib/statistics.ts` RE-EXPORTS THEM — one definition,
 * reachable from both sides of the server/client line. ⚠ Nothing that already
 * imported them from `lib/statistics` had to change.
 */

/**
 * ── ⚠⚠⚠ THE STATISTICS PAGE'S FIGURES (`P2-A2-E603` WS-A) ────────────────
 *
 * ⚠ SCOTT, 2026-09-23: *"Every figure is counted or it does not render. A figure
 * that can't be counted shows a dash and says why — never a 0. A real zero and
 * an unknown must not look the same."*
 *
 * ⚠⚠ THAT RULE WAS ALREADY THE PAGE'S OWN DOCTRINE AND PREDATES THIS BRIEF.
 * `/stats` has said since `E010`: *"a provider shown 'Job Success 0%' would
 * reasonably think they had failed at something, and '$0 earned' is a claim we
 * have not earned the right to make."* ⚠ This module extends that page; it does
 * not replace it.
 *
 * ── ⚠⚠⚠ THE TYPE IS THE ENFORCEMENT ──────────────────────────────────────
 *
 * ⚠ A figure is `number` (counted) or `{ uncounted: string }` (a dash and the
 * reason). ⚠⚠ THERE IS NO THIRD STATE AND NO `null` THAT A RENDERER COULD TURN
 * INTO `0` BY ACCIDENT — the component cannot print a dash without a reason,
 * and cannot print a number that was never counted. **The compiler carries the
 * rule, not a convention.**
 */
export type Figure = number | { uncounted: string };

/** ⚠ `true` for a real, measured zero — which RENDERS as `0`, deliberately. */
export const isCounted = (f: Figure): f is number => typeof f === "number";

/**
 * ── ⚠⚠⚠ THE TREND PERIOD IS DEFINED HERE, NOT IN A COMPONENT ─────────────
 *
 * ⚠ Only the two periods Scott named. No others, ever — a period nobody asked
 * for is a window somebody has to explain.
 * ⚠⚠ IT LIVES BESIDE THE BUCKETING THAT IMPLEMENTS IT. `StatCardBacks` re-exports
 * it so the components are unchanged, but **the period and the query that
 * answers it are one file apart, not one layer apart.**
 */
export type TrendPeriod = "90d" | "ytd";

/**
 * ── ⚠⚠⚠ THE BUCKETS ARE WHAT MAKE THE PERIOD CONTROL REAL ────────────────
 *
 * ⚠⚠⚠ MEASURED DEFECT, FIXED HERE (`E603` WS-A, at the correction renders):
 * the series was EIGHT FIXED WEEKS regardless of the period, so `90 Days` and
 * `YTD` drew **the identical line** — the pill moved, the data did not.
 * ⚠⚠ THAT IS THE SAME DEFECT AS THE FRONT-FACE PERIOD SWITCH SCOTT HAD REMOVED
 * IN CORRECTION 4: a control that reports a change it did not make. A switch
 * that does nothing is worse than no switch, because the member believes the
 * second reading.
 *
 * ⚠ `90d` — THIRTEEN WEEKLY buckets (13 × 7 = 91 days), oldest first.
 * ⚠ `ytd` — ONE CALENDAR MONTH PER BUCKET, January through the current month.
 * ⚠⚠ THE GRAIN CHANGES WITH THE SPAN ON PURPOSE: 39 weekly points across a year
 * is noise at 280px wide, and a year drawn in 13 weeks would not be a year.
 *
 * ⚠⚠ THE BUCKETS ARE HALF-OPEN `[lo, hi)` SO NO ROW IS COUNTED TWICE at a
 * boundary, and the last bucket runs to the END of the current week/month —
 * a row created today lands in it rather than falling off the end.
 */
type Bucket = { lo: Date; hi: Date };

export function trendBuckets(period: TrendPeriod, now: Date = new Date()): Bucket[] {
  if (period === "ytd") {
    const y = now.getFullYear();
    /* ⚠ `now.getMonth()` is 0-based, so +1 is "January through this month". */
    return Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
      lo: new Date(y, i, 1),
      hi: new Date(y, i + 1, 1),
    }));
  }
  /*
    ⚠⚠⚠ THE WINDOW ENDS AT THE END OF **TODAY**, NOT AT THE INSTANT `now`.
    ⚠ CAUGHT BY THIS BRIEF'S OWN GATE: anchoring the last bucket's `hi` to
    `now` makes the range `[lo, now)`, and the buckets are half-open — so a row
    written at this very moment falls PAST the last bucket and is counted by
    nobody, while still being inside the period the pills claim.
    ⚠⚠ ANCHORING TO MIDNIGHT ALSO MAKES THE BUCKETS STABLE WITHIN A DAY: two
    loads a minute apart return the same boundaries, so the line does not creep
    sideways on every refresh.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const start = new Date(now.getTime() - 13 * weekMs);
  */
  const weekMs = 7 * 86_400_000;
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(endOfToday.getTime() - 13 * weekMs);
  return Array.from({ length: 13 }, (_, i) => ({
    lo: new Date(start.getTime() + i * weekMs),
    hi: new Date(start.getTime() + (i + 1) * weekMs),
  }));
}

/** ⚠ ONE BUCKETER FOR BOTH SERIES — two would drift, and the two cards would
 *  then disagree about what "90 days" means on the same screen. */
export function countInBuckets(dates: Date[], buckets: Bucket[]): number[] {
  return buckets.map((b) => dates.filter((d) => d >= b.lo && d < b.hi).length);
}
