
export const SERVICE_PRODUCT_KINDS = ["DEPLOYABLE", "HOURS", "DELIVERABLE"] as const;
export type ServiceProductKind = (typeof SERVICE_PRODUCT_KINDS)[number];

/** Mirrors `enum PackagePricingType`. */
export const PRICING_TYPES = ["FIXED", "HOURLY", "TM", "RECURRING"] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

/** Mirrors `enum BillingPeriod`. */
export const BILLING_PERIODS = ["MONTHLY", "ANNUAL"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const PRICING_FOR_KIND: Record<ServiceProductKind, readonly PricingType[]> = {
  DEPLOYABLE: ["RECURRING"],
  HOURS: ["HOURLY", "RECURRING"],
  DELIVERABLE: ["FIXED"],
};

export type SolutionRow = {
  kind: ServiceProductKind;
  pricing_type: PricingType;
  billing_period: BillingPeriod | null;
  duration_weeks: number | null;
  /** Row counts, not the rows. */
  milestones: number;
  deliverables: number;
};

export function solutionViolations(r: SolutionRow): string[] {
  const bad: string[] = [];

  const allowed = PRICING_FOR_KIND[r.kind];
  if (!allowed.includes(r.pricing_type)) {
    bad.push(`${r.kind} may not be priced ${r.pricing_type} (allowed: ${allowed.join(", ")})`);
  }

  /* ⚠ BOTH DIRECTIONS. A FIXED package carrying a period is as wrong as a RECURRING
     one without it — the first is a number nobody will read, the second is $450 with
     no answer to "per what". */
  if (r.pricing_type === "RECURRING" && r.billing_period === null) {
    bad.push("RECURRING needs a billing_period — $450 is not $450/mo");
  }
  if (r.pricing_type !== "RECURRING" && r.billing_period !== null) {
    bad.push(`${r.pricing_type} must not carry a billing_period (${r.billing_period})`);
  }

  /* ⚠ THE DELIVERY CONSTRUCTS. An agent has coverage and setup, not a duration and a
     list of things delivered once. A milestone on a thing that never ends has nothing
     to be a percentage of the completion of. */
  if (r.kind === "DEPLOYABLE") {
    if (r.duration_weeks !== null) {
      bad.push(`DEPLOYABLE must not have duration_weeks (${r.duration_weeks}) — it runs until cancelled`);
    }
    if (r.milestones > 0) {
      bad.push(`DEPLOYABLE must have no milestones (${r.milestones}) — nothing completes`);
    }
    if (r.deliverables > 0) {
      bad.push(`DEPLOYABLE must have no deliverables (${r.deliverables}) — it runs, it does not deliver a list`);
    }
  }

  return bad;
}
