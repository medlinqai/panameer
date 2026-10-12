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

  // ONE HALF OF A RANGE IS NOT A RANGE, and it is not a rate either. Falling
  return null;
}

/** `true` when the provider has published something real. */
export function hasPublishedRate(r: RateFields): boolean {
  return rateDisplay(r) !== null;
}

// MC-E005: how a rate reads to buyers — "$150/hr onsite + expenses at cost", "$4,000/mo for 20 hrs".
export const EXPENSES_LABEL: Record<string, string> = { AT_COST: "Billed at cost", INCLUDED: "Included in rate", NOT_APPLICABLE: "None" };
const UNIT: Record<string, string> = { HOUR: "hr", DAY: "day", WEEK: "wk", MONTH: "mo", SESSION: "session", VISIT: "visit", EACH: "each" };
const WHERE: Record<string, string> = { ONSITE: "onsite", OFFSITE: "offsite" };

export function expensesSuffix(expenses: string | null | undefined): string {
  return expenses === "AT_COST" ? " + expenses at cost" : expenses === "INCLUDED" ? " · expenses included" : "";
}

export function buyersSee(r: { rateCents: number | null; unit: string | null; delivery?: string | null; expenses?: string | null; hoursIncluded?: number | null }): string | null {
  if (!r.rateCents) return null;
  const where = r.delivery ? WHERE[r.delivery] : undefined;
  const hrs = r.unit === "MONTH" && r.hoursIncluded ? ` for ${r.hoursIncluded} hrs` : "";
  return `${formatCents(r.rateCents).replace(/\.00$/, "")}/${UNIT[r.unit ?? "HOUR"] ?? "hr"}${where ? ` ${where}` : ""}${hrs}${expensesSuffix(r.expenses)}`;
}
