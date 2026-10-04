import { formatCents } from "@/lib/display";

export type RateFields = {
  hourlyRateCents?: number | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  currency?: string | null;
};

export const NO_RATE_PUBLISHED = "No rate published";

export function rateDisplay(r: RateFields): string | null {
  const currency = r.currency ?? "USD";

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
