
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

  const domain = P2P_DOMAINS.find((d) => d.key === key);
  const lever = domain?.costLever ? costLeverMultiplier : 1;

  const spendPart: [number, number] = [
    Math.round(spend[0] * weight * gap * lever),
    Math.round(spend[1] * weight * gap * lever),
  ];

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
  const revenue = bandRange(findBand(REVENUE_BANDS, basics.revenueBand));
  const spendBase: [number, number] =
    spend[1] > 0 ? spend : [Math.round(revenue[0] * 0.3), Math.round(revenue[1] * 0.3)];

  const head = HEADCOUNT_BANDS.find((b) => b.id === answers.headcountBand) ?? null;
  const laborCents: [number, number] = head
    ? [head.low * LOADED_LABOR_CENTS, (head.high ?? head.low) * LOADED_LABOR_CENTS]
    : [0, 0];

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
  const r = bandRange(findBand(REVENUE_BANDS, basics.revenueBand));
  const floor = Math.round(r[0] * 0.1);
  return [floor, floor];
}
