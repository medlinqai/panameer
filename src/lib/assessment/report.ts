import { prisma } from "@/lib/prisma";
import { EBITDA_BANDS, findBand } from "@/lib/assessment/bands";
import { scoreAssessment, ebitdaRange, type Answers, type Basics } from "@/lib/assessment/scoring";
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
    include: { invites: { select: { process: true, name: true, email: true } } },
  });
  if (!a) return null;

  const answers = (a.answers ?? {}) as unknown as Answers;
  const basics: Basics = {
    revenueBand: a.revenue_band,
    ebitdaBand: a.ebitda_band,
    platform: a.platform,
    state: a.state,
  };

  const scored = scoreAssessment(answers, basics);
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
