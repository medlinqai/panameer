/**
 * SCORING — maturity arithmetic, weighted by the CLIENT'S dollars.
 *
 * Two axes, kept apart on purpose (the 2026-08-13 scoring decisions):
 *
 *   MATURITY  — where they are today, 10–50 per capability domain.
 *   DOLLARS   — how much money runs through that domain for THIS company.
 *
 * The ranking is the product. That is the whole idea: a company can be at rung
 * 10 in contract management and it still should not be their first move if they
 * have eleven suppliers, while rung 30 in invoice matching at 1,200 invoices a
 * month is where the money actually is. Ranking on maturity alone produces a
 * list sorted by embarrassment rather than by opportunity, which is how a free
 * assessment ends up recommending work nobody should buy.
 *
 * ── EVERYTHING HERE IS DELIBERATELY SIMPLE ARITHMETIC ────────────────────────
 *
 * No model call, no regression, no benchmark database — none of which exist
 * yet, and all of which would be invented precision on top of four band
 * answers. The brief asks for conservative sizing, and the honest form of that
 * is arithmetic a person can check on the call.
 */

import {
  COST_LEVER_BANDS,
  EBITDA_BANDS,
  HEADCOUNT_BANDS,
  REVENUE_BANDS,
  SPEND_BANDS,
  bandRange,
  findBand,
} from "@/lib/assessment/bands";
import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

export type Answers = {
  /** domainKey → 10|20|30|40|50, or null for "Not sure". */
  maturity: Record<string, number | null>;
  spendBand?: string | null;
  costLeverBand?: string | null;
  headcountBand?: string | null;
  aiMode?: string | null;
};

export type Basics = {
  revenueBand?: string | null;
  ebitdaBand?: string | null;
  platform?: string | null;
  state?: string | null;
};

/**
 * How much of P2P's money each domain sits on, as a share of supplier spend.
 *
 * ⚠ THESE ARE JUDGEMENT WEIGHTS, NOT MEASUREMENTS — they encode "sourcing and
 * contracting decide the price you pay; matching and payments decide the
 * leakage" and nothing more. They are here in one named table, summing to 1.0,
 * so the assumption is arguable rather than buried in a formula. The unit test
 * asserts the sum, because a table that drifts off 1.0 silently rescales every
 * report.
 */
/**
 * ⚠ THE TWO DOMAINS DELIBERATELY OUTSIDE THE DOLLAR MODEL (E034), AND THIS SET
 * EXISTS SO THE HOLE IS DECLARED RATHER THAN SILENT.
 *
 * Scott authored Data Analytics & AI Governance and Change Management & AI Adoption
 * in the 2026-08-18 design deck, so they are ASSESSED — they answer questions and
 * they move `maturityPct`. They recover $0, because `DOLLAR_WEIGHTS` has no entry
 * for either.
 *
 * ⚠ THAT IS NOT AN OVERSIGHT TO FIX IN PASSING. The weights are asserted to sum to
 * exactly 1.0, so giving these two a share means RESCALING ALL EIGHT existing
 * weights — which changes the dollar figure on every report ever produced. That is
 * Scott's decision, explicitly reserved to him, and the brief that added these
 * domains says to report it and not to invent a weight.
 *
 * ⚠ IT IS ALSO A REAL PRODUCT GAP, not just bookkeeping: a domain can score badly
 * here and contribute nothing to the opportunity ranking, so the report can show a
 * weakness with no dollars and no curated move beside it. Two of ten domains are in
 * that state today.
 *
 * `check:assessment` pins this set: the "every domain has a weight" and "every
 * domain has a curated move" guards exempt exactly these keys and nothing else, and
 * a separate assertion fails if the set and the actual gaps stop agreeing. So a
 * NINTH unweighted domain still breaks the build, which is the property the original
 * assertions were protecting.
 */
export const UNWEIGHTED_DOMAINS: ReadonlySet<string> = new Set([
  "data_ai_governance",
  "change_ai_adoption",
]);

export const DOLLAR_WEIGHTS: Record<string, number> = {
  sourcing: 0.24,
  contracts: 0.16,
  invoices: 0.16,
  payments: 0.14,
  purchase_orders: 0.12,
  requisitioning: 0.08,
  receiving: 0.06,
  supplier_risk: 0.04,
};

/** Fully-loaded cost of one person supporting purchasing, per year, in cents. */
const LOADED_LABOR_CENTS = 75_000_00;

/**
 * The share of a domain's dollars that is realistically addressable, per rung.
 *
 * Read this as "how much of the money running through here is currently being
 * left on the table at this level of maturity". Rung 50 is 0 by definition —
 * an AI-driven domain has no gap to sell — and the curve is intentionally flat
 * and low. 6% of addressable spend for a fully manual domain is a fraction of
 * what a vendor deck would claim, which is the point.
 */
/*
  ⚠ 23 AND 37 ARE INTERPOLATED FROM THE EXISTING CURVE, NOT INVENTED.

  The ladder went from five rungs (10/20/30/40/50) to four (10/23/37/50). The
  endpoints did not move, so `maturityPercent` and the `rung >= 50` zero-gap
  ceiling are untouched; only two new keys were needed, and they are read off
  the curve that was already here rather than picked:

    23 sits between 20 and 30.  slope = (0.025 - 0.045) / 10 = -0.0020 / point
                                0.045 + 3 x (-0.0020) = 0.039
    37 sits between 30 and 40.  slope = (0.010 - 0.025) / 10 = -0.0015 / point
                                0.025 + 7 x (-0.0015) = 0.0145

  ⚠ THE FIVE ORIGINAL KEYS STAY. Assessments already stored answer 20, 30 and 40,
  and a report re-scored after this change has to produce the number it produced
  before — `GAP_BY_RUNG[20]` returning undefined would silently zero a stored
  respondent's opportunity via the `?? 0` below.
*/
const GAP_BY_RUNG: Record<number, number> = {
  10: 0.06,
  20: 0.045,
  23: 0.039,
  30: 0.025,
  37: 0.0145,
  40: 0.01,
  50: 0,
};

export type DomainResult = {
  key: string;
  name: string;
  formal: string;
  /** 10–50, or null when they answered "Not sure". */
  rung: number | null;
  /** Dollars at stake per year, [low, high] cents. Zero for rung 50. */
  opportunity: [number, number];
  /** Rank position, 1 = biggest opportunity. Null when not ranked. */
  rank: number | null;
};

export type Scored = {
  /** 0–100 for display. Excludes "Not sure" domains — see below. */
  maturityPct: number;
  /** Domains answered "Not sure" — a finding in their own right. */
  unknownDomains: string[];
  domains: DomainResult[];
  /** Ranked, biggest dollars first, rung-50 and unknown domains excluded. */
  ranked: DomainResult[];
  /** Total annual opportunity, [low, high] cents. */
  opportunity: [number, number];
  /** Estimated Year-1 investment, [low, high] cents. */
  investment: [number, number];
  /** True when the platform answer was legacy ERP. */
  leapfrog: boolean;
};

/**
 * Maturity as a percentage, over the domains they could actually answer.
 *
 * "Not sure" is EXCLUDED rather than scored zero. Scoring it zero would mean a
 * respondent who is candid about not knowing gets a worse maturity number than
 * one who guesses, which punishes the honest answer and corrupts the only
 * number on the report that claims to describe them.
 */
function maturityPercent(maturity: Record<string, number | null>): {
  pct: number;
  unknown: string[];
} {
  const unknown: string[] = [];
  const scores: number[] = [];
  for (const d of P2P_DOMAINS) {
    const v = maturity[d.key];
    if (v === null || v === undefined) unknown.push(d.key);
    else scores.push(v);
  }
  if (!scores.length) return { pct: 0, unknown };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // 10→0%, 50→100%: the ladder starts at 10, so subtract the floor first.
  return { pct: Math.round(((avg - 10) / 40) * 100), unknown };
}

/**
 * The dollars at stake in one domain.
 *
 * spend × weight × gap(rung), plus a labor component for the domains where the
 * headcount answer is the honest driver rather than spend. Both are ranges
 * because both inputs are bands.
 */
function domainOpportunity(
  key: string,
  rung: number | null,
  spend: [number, number],
  laborCents: [number, number],
  costLeverMultiplier: number
): [number, number] {
  if (rung === null || rung >= 50) return [0, 0];
  const gap = GAP_BY_RUNG[rung] ?? 0;
  const weight = DOLLAR_WEIGHTS[key] ?? 0;

  /*
    THE COST LEVER ONLY MOVES THE COST-LEVER DOMAINS. Whether spend sits on
    negotiated contracts changes what sourcing, contracting and payments can
    recover; it does not change how long it takes someone to key an invoice.
    Applying it globally was the tempting shortcut and would have inflated
    every number on the report by the same factor.
  */
  const domain = P2P_DOMAINS.find((d) => d.key === key);
  const lever = domain?.costLever ? costLeverMultiplier : 1;

  const spendPart: [number, number] = [
    Math.round(spend[0] * weight * gap * lever),
    Math.round(spend[1] * weight * gap * lever),
  ];

  /*
    Labor lands on the transactional domains — the ones a person spends the day
    inside. The share of the team's time this domain can give back is capped by
    the same rung curve, so a "System" rung recovers a fraction of what a
    "Manual" one does.
  */
  const LABOR_DOMAINS: Record<string, number> = {
    invoices: 0.3,
    requisitioning: 0.15,
    purchase_orders: 0.15,
    receiving: 0.1,
    payments: 0.1,
  };
  const laborShare = LABOR_DOMAINS[key] ?? 0;
  const laborPart: [number, number] = [
    Math.round(laborCents[0] * laborShare * gap * 8),
    Math.round(laborCents[1] * laborShare * gap * 8),
  ];

  return [spendPart[0] + laborPart[0], spendPart[1] + laborPart[1]];
}

export function scoreAssessment(answers: Answers, basics: Basics): Scored {
  const { pct, unknown } = maturityPercent(answers.maturity ?? {});

  const spend = bandRange(findBand(SPEND_BANDS, answers.spendBand));
  /*
    Supplier spend is the base, but it is optional-ish in practice — someone can
    reach the questions and not know it. Falling back to a fraction of revenue
    keeps the report from reading $0 across the board. 30% of revenue is a
    conservative floor for a services SMB's outside spend.
  */
  const revenue = bandRange(findBand(REVENUE_BANDS, basics.revenueBand));
  const spendBase: [number, number] =
    spend[1] > 0 ? spend : [Math.round(revenue[0] * 0.3), Math.round(revenue[1] * 0.3)];

  const head = HEADCOUNT_BANDS.find((b) => b.id === answers.headcountBand) ?? null;
  const laborCents: [number, number] = head
    ? [head.low * LOADED_LABOR_CENTS, (head.high ?? head.low) * LOADED_LABOR_CENTS]
    : [0, 0];

  /*
    A LOW contracted share means MORE opportunity, so the multiplier is
    inverted. Someone with 80%+ of spend already on negotiated contracts has
    largely taken this lever; someone under 20% has not. Floored at 0.5 rather
    than 0 — even a fully contracted book has renegotiation value, and a zero
    would erase the sourcing move entirely for the companies most able to buy it.
  */
  const lever = COST_LEVER_BANDS.find((b) => b.id === answers.costLeverBand);
  const contracted = lever ? (lever.low + lever.high) / 2 : 0.5;
  const costLeverMultiplier = Math.max(0.5, 1.5 - contracted);

  const domains: DomainResult[] = P2P_DOMAINS.map((d) => {
    const rung = answers.maturity?.[d.key] ?? null;
    return {
      key: d.key,
      name: d.name,
      formal: d.formal,
      rung,
      opportunity: domainOpportunity(d.key, rung, spendBase, laborCents, costLeverMultiplier),
      rank: null,
    };
  });

  const ranked = domains
    .filter((d) => d.opportunity[1] > 0)
    .sort((a, b) => b.opportunity[1] - a.opportunity[1])
    .map((d, i) => ({ ...d, rank: i + 1 }));
  for (const r of ranked) {
    const d = domains.find((x) => x.key === r.key);
    if (d) d.rank = r.rank;
  }

  const opportunity: [number, number] = [
    ranked.reduce((n, d) => n + d.opportunity[0], 0),
    ranked.reduce((n, d) => n + d.opportunity[1], 0),
  ];

  /*
    INVESTMENT IS A SHARE OF THE OPPORTUNITY, not a quote. Phase 1 has no
    pricing model and no scope, so the only honest thing to show is the
    proportion the work would have to stay under for the "pays for itself"
    promise to hold. 55–70% of the LOW end keeps Net Year 1 positive even at
    the bottom of every range — which is what "positive by design" has to mean
    if the tile is going to say it.
  */
  const investment: [number, number] = [
    Math.round(opportunity[0] * 0.55),
    Math.round(opportunity[0] * 0.7),
  ];

  return {
    maturityPct: pct,
    unknownDomains: unknown,
    domains,
    ranked,
    opportunity,
    investment,
    leapfrog: basics.platform === "legacy",
  };
}

/** Used by the report and the deck so they can never disagree. */
export function ebitdaRange(basics: Basics): [number, number] {
  const e = bandRange(findBand(EBITDA_BANDS, basics.ebitdaBand));
  if (e[1] > 0) return e;
  /*
    EBITDA IS OPTIONAL AND SKIPPING IT MUST NOT BREAK THE FUNDING TILE. With no
    profit figure the base is 10% of the revenue band's LOW END, as a single
    figure rather than a range.

    ⚠ NOT 10% OF THE WHOLE BAND, which is what this did first and which the
    unit test rejected. 10% of $5M–$25M is $500K–$2.5M — a HIGHER ceiling than
    someone who actually answered "$500K–$2M" would have got, so skipping the
    question could produce a bigger funding number than answering it. Taking
    only the low end makes the fallback conservative by construction: it can
    never exceed what the same revenue band would support at the same margin.
  */
  const r = bandRange(findBand(REVENUE_BANDS, basics.revenueBand));
  const floor = Math.round(r[0] * 0.1);
  return [floor, floor];
}
