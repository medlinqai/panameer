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

/**
 * THE REPORT VIEW MODEL — built once, rendered by both the dashboard and the deck.
 *
 * The deck is the report's argument compressed to six slides, so the two must
 * never disagree about the number. One builder, two renderers: if the funding
 * tile says $90–140K, the slide cannot say something else, because neither of
 * them computes it.
 *
 * ── ⚠ IT READS STORED ROWS NOW, IT DOES NOT RE-SCORE ─────────────────────────
 *
 * Every per-domain rung, dollar range and rank used to be recomputed here by
 * `scoreAssessment()` on every render, which meant moving a judgement weight in
 * `DOLLAR_WEIGHTS` silently rewrote every report ever sent — the exact failure
 * `Assessment.score_pct`'s own comment was written to prevent, applied to one
 * field out of a dozen (brief_assessment_instance_model WS2).
 *
 * `AssessmentDomainResult` now holds one frozen row per domain, and
 * `scoredFromStored` below reassembles the shape the renderers already expect.
 *
 * ⚠ THE RECOMPUTE PATH IS DELIBERATELY STILL HERE, and reachable only when an
 * assessment has NO stored rows: a submission that landed between this deploy and
 * the backfill, or one whose rows were deleted. It is a fallback, not the
 * default, and `check:assessment-instance` fails the build if it becomes the
 * default again.
 */

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

  /**
   * The real-data feed for the EXISTING `MaturityDashboard` component.
   *
   * That component was built for the hardcoded sample framework and its own
   * header comment names this exact moment: "When real scoring arrives,
   * `sample` goes false on the data and both [the Sample Read chip and the
   * caption] disappear on their own." So it is reused rather than replaced —
   * same component, same gauge, measured numbers, and the honesty labelling
   * switches itself off because it was keyed to the data all along.
   */
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
      /*
        Ordered by `rank` so the ranked list rebuilds in exactly the order it was
        stored in. Nulls (unranked — rung 50 or "Not sure") sort last.
      */
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

  /*
    ⚠ STORED FIRST. `scoreAssessment` is the FALLBACK and only runs for an
    assessment with no domain rows at all.
  */
  const scored: Scored =
    a.domainResults.length > 0
      ? scoredFromStored(a.domainResults, a.score_pct, a.platform)
      : scoreAssessment(answers, basics);
  const ebitda = ebitdaRange(basics);
  const rate = await resolveTaxRate(a.state);
  const funding = fundingFromEbitda(ebitda, rate.bps);

  /*
    NET IS COMPUTED AT THE WORST END OF EVERY RANGE — funding low, opportunity
    low, investment HIGH. The tile claims "positive by design", and a claim
    that only survives at the optimistic end of three ranges is not a design,
    it is a hope. If this ever goes negative the tile says so rather than
    printing "Positive" over a number that is not.
  */
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
      /*
        Four stages over 0-100. `Math.min` guards the top: a perfect 100 would
        index 4 and read `undefined` as the stage name.
      */
      stage: Math.min(MATURITY_STAGES.length - 1, Math.floor(scored.maturityPct / 25)),
      domains: P2P_DOMAINS.map((d) => d.formal),
      /*
        THE TILES ARE THE ANSWERS, NOT INVENTED KPIs. The sample framework's
        tiles were figures like "87% touchless PO rate" that nothing measured;
        these four are counted directly from what the person told us, and the
        `delta` slot is blank because there is no prior assessment to compare
        against. A quarter-over-quarter arrow on a first report would be fiction.
      */
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

/**
 * "$90–140K" — the report's money format.
 *
 * Rounded to the nearest 10K above six figures and 1K below, because the inputs
 * are bands and a range that reads "$91,340–$143,905" claims a precision the
 * answers cannot support. A collapsed range (both ends equal, which happens on
 * the open-ended top band) prints as one figure rather than "$X–$X".
 */
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

/**
 * Stored rows → the `Scored` shape the report and the deck already render.
 *
 * ── ⚠ NOTHING HERE IS ARITHMETIC ON THE ANSWERS ──────────────────────────────
 *
 * Each field is either read straight off a row or is a pure function of the
 * stored rows. In particular:
 *
 *   maturityPct   `Assessment.score_pct` — frozen at submit since day one.
 *   opportunity   the SUM of the stored per-domain ranges.
 *   investment    55–70% of the opportunity LOW end. This is not a weight, it is
 *                 the "pays for itself" ratio the tile's own claim rests on, and
 *                 it is reproduced here EXACTLY — including the rounding — because
 *                 a report re-rendered after this change has to print what it
 *                 printed before.
 *   leapfrog      a field read: `platform === "legacy"`.
 *
 * ⚠ `name` AND `formal` STILL COME FROM THE QUESTION BANK, not from the row.
 * They are display copy, not results — a typo fix in a domain's name SHOULD
 * appear on an old report, and storing them would freeze the typo. `domain_key`
 * is the durable identifier; a key the bank no longer knows falls back to
 * showing the key rather than an empty label.
 */
function scoredFromStored(rows: StoredDomainRow[], scorePct: number, platform: string | null): Scored {
  const domains: DomainResult[] = rows.map((r) => {
    const d = P2P_DOMAINS.find((x) => x.key === r.domain_key);
    return {
      key: r.domain_key,
      name: d?.name ?? r.domain_key,
      formal: d?.formal ?? r.domain_key,
      rung: r.rung,
      /*
        ⚠ `?? 0` AFTER `Number()`, NOT A BigInt LITERAL. `0n` needs an ES2020
        target and this tsconfig targets lower; `Number(null)` is 0 anyway, so
        the coalesce guards the null case without a literal the build rejects.
      */
      opportunity: [
        Number(r.opportunity_low_cents ?? 0),
        Number(r.opportunity_high_cents ?? 0),
      ],
      rank: r.rank,
    };
  });

  /*
    ⚠ THE BANK'S ORDER, NOT THE QUERY'S. `scoreAssessment` maps over
    `P2P_DOMAINS`, so `domains` was always in bank order — and the report's
    "areas still manual" tile counts over it while the dashboard lists it. The
    query is ordered by rank so `ranked` rebuilds correctly; this puts `domains`
    back the way every renderer has always received it. Rows whose key is not in
    the bank keep their relative order at the end.
  */
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
