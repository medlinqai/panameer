/**
 * Tests for the assessment arithmetic.
 *
 * The report shows money to a prospect, so the properties worth pinning are the
 * ones that would embarrass us on a call: that "not sure" is not scored as
 * failure, that a low-dollar domain does not outrank a high-dollar one, that
 * the funding rate is the admin's number and not a constant, and that "Net,
 * Year 1: Positive" survives the worst end of every range.
 */

import {
  DOLLAR_WEIGHTS,
  ebitdaRange,
  scoreAssessment,
  type Answers,
  type Basics,
} from "@/lib/assessment/scoring";
import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";
import { REVENUE_BANDS, EBITDA_BANDS, SPEND_BANDS } from "@/lib/assessment/bands";
import { P2P_MOVES } from "@/lib/assessment/solutions";
import { fundingFromEbitda, DEFAULT_TAX_RATE_BPS } from "@/lib/assessment/tax-rate";
import { formatRange } from "@/lib/assessment/report";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`);
  }
}

const allRungs = (v: number | null): Record<string, number | null> =>
  Object.fromEntries(P2P_DOMAINS.map((d) => [d.key, v]));

const BASICS: Basics = {
  revenueBand: "5to25m",
  ebitdaBand: "500kto2m",
  platform: "cloud",
  state: "CA",
};
const ANSWERS = (maturity: Record<string, number | null>): Answers => ({
  maturity,
  spendBand: "1to5m",
  costLeverBand: "20to40",
  headcountBand: "4to6",
  aiMode: "propose",
});

console.log("\n=== the weights table ===");
{
  const sum = Object.values(DOLLAR_WEIGHTS).reduce((a, b) => a + b, 0);
  check(
    "dollar weights sum to 1.0 (a drifting table silently rescales every report)",
    Math.abs(sum - 1) < 1e-9,
    sum
  );
  check(
    "every capability domain has a weight",
    P2P_DOMAINS.every((d) => typeof DOLLAR_WEIGHTS[d.key] === "number"),
    P2P_DOMAINS.filter((d) => !(d.key in DOLLAR_WEIGHTS)).map((d) => d.key)
  );
  check(
    "every capability domain has a curated move (a gap with nothing to do about it is a dead end)",
    P2P_DOMAINS.every((d) => Boolean(P2P_MOVES[d.key])),
    P2P_DOMAINS.filter((d) => !P2P_MOVES[d.key]).map((d) => d.key)
  );
}

console.log("\n=== maturity ===");
{
  const worst = scoreAssessment(ANSWERS(allRungs(10)), BASICS);
  const best = scoreAssessment(ANSWERS(allRungs(50)), BASICS);
  check("all rung-10 is 0%", worst.maturityPct === 0, worst.maturityPct);
  check("all rung-50 is 100%", best.maturityPct === 100, best.maturityPct);

  /*
    THE ONE THAT MATTERS. A respondent who says "not sure" everywhere must not
    score worse than one who says "manual" everywhere — scoring candour as
    failure would corrupt the only number on the report that describes them.
  */
  const unsure = scoreAssessment(ANSWERS(allRungs(null)), BASICS);
  check(
    "'not sure' everywhere does not score below all-manual",
    unsure.maturityPct >= worst.maturityPct,
    { unsure: unsure.maturityPct, manual: worst.maturityPct }
  );
  check(
    "'not sure' is surfaced as a finding instead of being swallowed",
    unsure.unknownDomains.length === P2P_DOMAINS.length,
    unsure.unknownDomains.length
  );
  check(
    "'not sure' domains produce no opportunity (we don't sell against an admission)",
    unsure.ranked.length === 0,
    unsure.ranked.map((r) => r.key)
  );
  check(
    "a fully mature process has nothing ranked",
    best.ranked.length === 0,
    best.ranked.map((r) => r.key)
  );
}

console.log("\n=== ranking is by DOLLARS, not by how far behind ===");
{
  /*
    supplier_risk is the LOWEST-weighted domain and sourcing the highest. Put
    supplier_risk at the bottom rung and sourcing one rung better: ranking on
    maturity alone would put supplier_risk first. It must not.
  */
  const m = allRungs(50);
  m.supplier_risk = 10;
  m.sourcing = 20;
  const s = scoreAssessment(ANSWERS(m), BASICS);
  check(
    "the higher-dollar domain outranks the lower-maturity one",
    s.ranked[0]?.key === "sourcing",
    s.ranked.map((r) => `${r.key}:${r.rung}`)
  );

  const ranks = s.ranked.map((r) => r.rank);
  check("ranks are 1..n with no gaps", ranks.join(",") === ranks.map((_, i) => i + 1).join(","), ranks);
}

console.log("\n=== the cost lever only moves the cost-lever domains ===");
{
  const m = allRungs(10);
  const low = scoreAssessment({ ...ANSWERS(m), costLeverBand: "gt80" }, BASICS);
  const high = scoreAssessment({ ...ANSWERS(m), costLeverBand: "lt20" }, BASICS);
  const src = (s: typeof low) => s.domains.find((d) => d.key === "sourcing")!.opportunity[1];
  const inv = (s: typeof low) => s.domains.find((d) => d.key === "invoices")!.opportunity[1];
  check(
    "less contracted spend => more sourcing opportunity",
    src(high) > src(low),
    { lt20: src(high), gt80: src(low) }
  );
  check(
    "…and the invoice-matching number is untouched by it",
    inv(high) === inv(low),
    { lt20: inv(high), gt80: inv(low) }
  );
}

console.log("\n=== funding is the admin's rate, applied to EBITDA ===");
{
  const e = ebitdaRange({ ...BASICS });
  const at18 = fundingFromEbitda(e, DEFAULT_TAX_RATE_BPS);
  const at25 = fundingFromEbitda(e, 2500);
  check("18% of the EBITDA band low end", at18[0] === Math.round((e[0] * 1800) / 10_000), at18);
  check("a different admin rate produces a different number", at25[0] > at18[0], { at18, at25 });
  check("basis points, so 18% is exact", DEFAULT_TAX_RATE_BPS === 1800, DEFAULT_TAX_RATE_BPS);

  /*
    EBITDA is optional. Skipping it must not zero the funding tile — it falls
    back to a conservative share of revenue.
  */
  const skipped = ebitdaRange({ ...BASICS, ebitdaBand: null });
  check("skipping EBITDA still yields a funding base", skipped[1] > 0, skipped);
  check("…and that base is below the real band (conservative)", skipped[1] < e[1], { skipped, given: e });
}

console.log("\n=== 'Net, Year 1: Positive' has to survive the worst case ===");
{
  const s = scoreAssessment(ANSWERS(allRungs(10)), BASICS);
  const funding = fundingFromEbitda(ebitdaRange(BASICS), DEFAULT_TAX_RATE_BPS);
  const netLow = funding[0] + s.opportunity[0] - s.investment[1];
  check(
    "funding low + opportunity low − investment HIGH is still positive",
    netLow > 0,
    { funding: funding[0], oppLow: s.opportunity[0], invHigh: s.investment[1], netLow }
  );
}

console.log("\n=== the leapfrog flag ===");
{
  check(
    "legacy ERP sets it",
    scoreAssessment(ANSWERS(allRungs(20)), { ...BASICS, platform: "legacy" }).leapfrog
  );
  check(
    "cloud ERP does not",
    !scoreAssessment(ANSWERS(allRungs(20)), { ...BASICS, platform: "cloud" }).leapfrog
  );
}

console.log("\n=== money formatting ===");
{
  check("a range reads as a range", formatRange([9_000_000, 14_000_000]) === "$90K–140K",
    formatRange([9_000_000, 14_000_000]));
  check("a collapsed range prints once, not '$X–X'", formatRange([5_000_000, 5_000_000]) === "$50K",
    formatRange([5_000_000, 5_000_000]));
  check("millions read as millions", formatRange([150_000_000, 150_000_000]) === "$1.5M",
    formatRange([150_000_000, 150_000_000]));
}

/*
  THE CHECK THAT WOULD HAVE CAUGHT THE 10x BUG.

  Every band carries a human label and a pair of cent values, and nothing tied
  them together — so "$500K–$2M" quietly held $5M–$20M and the only symptom was
  a funding figure an order of magnitude too big on a page nobody had rendered
  yet. This parses the label and asserts the cents agree, for every band in
  every table. It is a boring test and it is the one that matters.
*/
console.log("\n=== band labels agree with their cent values ===");
{
  const parse = (t: string): number | null => {
    const m = t.match(/\$([\d.]+)\s*([KM])?/);
    if (!m) return null;
    const n = Number(m[1]);
    const mult = m[2] === "M" ? 1_000_000 : m[2] === "K" ? 1_000 : 1;
    return Math.round(n * mult * 100); // cents
  };
  for (const [name, table] of [
    ["REVENUE", REVENUE_BANDS],
    ["EBITDA", EBITDA_BANDS],
    ["SPEND", SPEND_BANDS],
  ] as const) {
    for (const b of table) {
      const nums = b.label.match(/\$[\d.]+\s*[KM]?/g) ?? [];
      const parsed = nums.map(parse).filter((n): n is number => n !== null);
      if (b.label.startsWith("<") || /^Under/i.test(b.label)) {
        check(`${name} ${b.label}: low is 0, high matches the label`,
          b.lowCents === 0 && b.highCents === parsed[0], { b, parsed });
      } else if (b.label.endsWith("+")) {
        check(`${name} ${b.label}: low matches the label, open-ended`,
          b.lowCents === parsed[0] && b.highCents === null, { b, parsed });
      } else {
        check(`${name} ${b.label}: both ends match the label`,
          b.lowCents === parsed[0] && b.highCents === parsed[1], { b, parsed });
      }
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
