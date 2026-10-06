import { prisma } from "@/lib/prisma";
import { EBITDA_BANDS, findBand } from "@/lib/assessment/bands";
import {
  scoreAssessment,
  ebitdaRange,
  type Answers,
  type Basics,
  type DomainResult,
  type Scored,
} from "@/lib/assessment/scoring";
import type { StoredDomainRow } from "@/lib/assessment/domain-results";
import { moveFor, type Move } from "@/lib/assessment/solutions";
import { fundingFromEbitda, resolveTaxRate } from "@/lib/assessment/tax-rate";
import { MATURITY_STAGES, type ProcessArea } from "@/lib/assessment-data";
import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

export type MoneyRange = [number, number];

export type ReportModel = {
  id: string;
  shareToken: string;
  companyName: string;
  /** The raw enum key ("P2P") — the display name is not a stable identifier. */
  processKey: string;
  processName: string;
  email: string;
  claimed: boolean;

  maturityPct: number;
  unknownDomains: string[];
  leapfrog: boolean;

  /** Year-1 tiles. All ranges — the inputs were bands. */
  funding: MoneyRange;
  opportunity: MoneyRange;
  investment: MoneyRange;
  /** Net = funding.low + opportunity.low − investment.high. Positive by design. */
  netLow: number;

  /** Where the funding number came from, for the admin/debug trail — never rendered as a caveat. */
  taxRateBps: number;
  taxRateGeography: string | null;
  /** True when EBITDA was skipped and the funding base is revenue-derived. */
  ebitdaEstimated: boolean;

  moves: (Move & { rank: number; opportunity: MoneyRange })[];

  /** Phase 2 fills this from the tracker. Fresh report = 0. */
  progressPct: number;

  maturityArea: ProcessArea;

  invites: { process: string; name: string; email: string }[];
};

const PROCESS_NAMES: Record<string, string> = {
  P2P: "Procurement",
  O2C: "Order-to-Cash",
  R2R: "Record-to-Report",
  H2R: "Hire-to-Retire",
};

export async function buildReport(shareToken: string): Promise<ReportModel | null> {
  const a = await prisma.assessment.findUnique({
    where: { share_token: shareToken },
    include: {
      invites: { select: { process: true, name: true, email: true } },
      domainResults: { orderBy: [{ rank: { sort: "asc", nulls: "last" } }, { domain_key: "asc" }] },
    },
  });
  if (!a) return null;

  const answers = (a.answers ?? {}) as unknown as Answers;
  const basics: Basics = {
    revenueBand: a.revenue_band,
    ebitdaBand: a.ebitda_band,
    platform: a.platform,
    state: a.state,
  };

  const scored: Scored =
    a.domainResults.length > 0
      ? scoredFromStored(a.domainResults, a.score_pct, a.platform)
      : scoreAssessment(answers, basics);
  const ebitda = ebitdaRange(basics);
  const rate = await resolveTaxRate(a.state);
  const funding = fundingFromEbitda(ebitda, rate.bps);

  const netLow = funding[0] + scored.opportunity[0] - scored.investment[1];

  const moves = scored.ranked
    .map((d) => {
      const m = moveFor(d.key);
      return m ? { ...m, rank: d.rank ?? 0, opportunity: d.opportunity } : null;
    })
    .filter((m): m is Move & { rank: number; opportunity: MoneyRange } => m !== null);

  return {
    id: a.id,
    shareToken: a.share_token,
    companyName: a.company_name,
    processKey: a.process,
    processName: PROCESS_NAMES[a.process] ?? a.process,
    email: a.email,
    claimed: Boolean(a.user_id),
    maturityPct: scored.maturityPct,
    unknownDomains: scored.unknownDomains,
    leapfrog: scored.leapfrog,
    funding,
    opportunity: scored.opportunity,
    investment: scored.investment,
    netLow,
    taxRateBps: rate.bps,
    taxRateGeography: rate.geography,
    ebitdaEstimated: !findBand(EBITDA_BANDS, a.ebitda_band),
    moves,
    progressPct: 0,
    maturityArea: {
      key: "p2p",
      name: "Procure-to-Pay",
      glyph: "▣",
      score: scored.maturityPct,
      stage: Math.min(MATURITY_STAGES.length - 1, Math.floor(scored.maturityPct / 25)),
      domains: P2P_DOMAINS.map((d) => d.formal),
      tiles: [
        { value: `${scored.maturityPct}`, label: "Maturity score /100", delta: "" },
        {
          value: `${scored.domains.filter((d) => (d.rung ?? 99) <= 20).length}`,
          label: "Areas still manual",
          delta: "",
        },
        { value: `${scored.ranked.length}`, label: "Ranked opportunities", delta: "" },
        { value: `${scored.unknownDomains.length}`, label: "Answered “not sure”", delta: "" },
      ],
      /* The whole point: measured, so the "Sample Read" chip turns itself off. */
      sample: false,
    },
    invites: a.invites.map((i) => ({ process: i.process, name: i.name, email: i.email })),
  };
}

/** Rounded to the nearest 10K above six figures and 1K below, because the inputs */
export function formatRange([lo, hi]: MoneyRange): string {
  const fmt = (cents: number) => {
    const d = cents / 100;
    if (d >= 1_000_000) return `$${(Math.round(d / 100_000) / 10).toFixed(1)}M`;
    if (d >= 100_000) return `$${Math.round(d / 10_000) * 10}K`;
    if (d >= 1_000) return `$${Math.round(d / 1_000)}K`;
    return `$${Math.round(d)}`;
  };
  const a = fmt(lo);
  const b = fmt(hi);
  return a === b ? a : `${a}–${b.replace("$", "")}`;
}

/** Stored rows → the `Scored` shape the report and the deck already render. */
function scoredFromStored(rows: StoredDomainRow[], scorePct: number, platform: string | null): Scored {
  const domains: DomainResult[] = rows.map((r) => {
    const d = P2P_DOMAINS.find((x) => x.key === r.domain_key);
    return {
      key: r.domain_key,
      name: d?.name ?? r.domain_key,
      formal: d?.formal ?? r.domain_key,
      rung: r.rung,
      // target and this tsconfig targets lower; `Number(null)` is 0 anyway, so
      opportunity: [
        Number(r.opportunity_low_cents ?? 0),
        Number(r.opportunity_high_cents ?? 0),
      ],
      rank: r.rank,
    };
  });

  // THE BANK'S ORDER, NOT THE QUERY'S. `scoreAssessment` maps over
  const bankIndex = new Map(P2P_DOMAINS.map((d, i) => [d.key, i]));
  domains.sort(
    (x, y) =>
      (bankIndex.get(x.key) ?? Number.MAX_SAFE_INTEGER) -
      (bankIndex.get(y.key) ?? Number.MAX_SAFE_INTEGER)
  );

  /* Ranked = exactly the rows that carry a rank, in stored rank order. */
  const ranked = domains
    .filter((d) => d.rank !== null)
    .sort((x, y) => (x.rank ?? 0) - (y.rank ?? 0));

  const opportunity: MoneyRange = [
    ranked.reduce((n, d) => n + d.opportunity[0], 0),
    ranked.reduce((n, d) => n + d.opportunity[1], 0),
  ];

  return {
    maturityPct: scorePct,
    unknownDomains: domains.filter((d) => d.rung === null).map((d) => d.key),
    domains,
    ranked,
    opportunity,
    investment: [Math.round(opportunity[0] * 0.55), Math.round(opportunity[0] * 0.7)],
    leapfrog: platform === "legacy",
  };
}
