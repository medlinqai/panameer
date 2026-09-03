import { formatCents } from "@/lib/display";

/**
 * THE PUBLISHED RATE, RENDERED — the one rule, in one place (`P1-ALL-E374`).
 *
 * ── ⚠⚠ WHY THIS IS A LIB AND NOT A HELPER INSIDE A CARD ────────────────────
 *
 * Four surfaces show a provider's rate — `/community`, `/community/mentors`,
 * the profile identity block, and search results. A rule copied four times is a
 * rule that drifts four ways, and this particular rule has a failure mode that
 * MATTERS: printing `$0` for somebody who never set a price. `E374` puts it in
 * `lib/` so `check:community` can assert it, which a `.tsx` helper could not be.
 *
 * ── THE RULE, DECIDED BY THE BRIEF SO NOBODY RE-LITIGATES IT ───────────────
 *
 *   1. BOTH `rate_min_cents` AND `rate_max_cents` present  -> the range.
 *   2. OTHERWISE `hourly_rate_cents`                       -> the single figure.
 *   3. OTHERWISE                                           -> `null`, and the
 *      caller renders ONE HONEST LINE saying no rate is published.
 *
 * ⚠⚠ NEVER A ZERO AND NEVER A PLACEHOLDER. `formatCents(null)` returns `"—"`,
 * and a `0` would format as a real, wrong `$0.00`. This is the same rule My
 * Stats follows by rendering a dash rather than a fabricated `$0 earned`, and
 * the same one `lib/credits.ts` followed before it was parked: a number nobody
 * entered is a lie, and a price nobody set is the most expensive kind.
 *
 * ⚠ NO PLATFORM ANCHOR IS EVER SUBSTITUTED. `MICRO_SESSION_PRICE` was exactly
 * that and `E374` parked it — see `lib/mentors.ts`. A rate here is the person's
 * own or it is absent.
 *
 * ── ⚠ MEASURED AGAINST LIVE DATA, NOT ASSUMED (`E374`) ─────────────────────
 *
 * Of 25 marketplace-visible providers: 6 have a min/max range, 19 have ONLY
 * `hourly_rate_cents`, and 0 have neither. So RULE 2 CARRIES 76% OF THE
 * POPULATION and rule 3 currently renders for nobody — which is exactly why it
 * still has to exist and be correct, because onboarding can stop writing
 * `hourly_rate_cents` any day and the fallback is what stands between that and
 * a page full of `$0`.
 */

export type RateFields = {
  hourlyRateCents?: number | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  currency?: string | null;
};

/** ⚠ The single honest line when a provider has published no rate at all. */
export const NO_RATE_PUBLISHED = "No rate published";

/**
 * The rate as a display string, or `null` when there is nothing honest to show.
 * ⚠ Callers MUST render `NO_RATE_PUBLISHED` (or their own honest line) on null
 * rather than falling back to a zero.
 */
export function rateDisplay(r: RateFields): string | null {
  const currency = r.currency ?? "USD";

  /* ⚠ `!= null` NOT TRUTHINESS. A rate of 0 cents is falsy, and `||` would skip
     a real published zero into the next branch — which is the wrong reason to
     reach rule 3. Zero is handled by being unrepresentable in onboarding, not by
     being silently treated as absent here. */
  if (r.rateMinCents != null && r.rateMaxCents != null) {
    const lo = r.rateMinCents;
    const hi = r.rateMaxCents;
    return lo === hi
      ? formatCents(lo, currency)
      : `${formatCents(lo, currency)} – ${formatCents(hi, currency)}`;
  }

  if (r.hourlyRateCents != null) return formatCents(r.hourlyRateCents, currency);

  /* ⚠ ONE HALF OF A RANGE IS NOT A RANGE, and it is not a rate either. Falling
     back to whichever bound exists would advertise a floor as a price. */
  return null;
}

/** `true` when the provider has published something real. */
export function hasPublishedRate(r: RateFields): boolean {
  return rateDisplay(r) !== null;
}
