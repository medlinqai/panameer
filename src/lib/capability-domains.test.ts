/**
 * The one invariant this data has to keep.
 *
 * The ten domain scores mean to 42, and 42 is the org score on the product
 * shot's first tile ("42 vs. 73"). Both sections render within a screen of each
 * other, so a visitor can average the ten by eye. This test is what stops a
 * future score edit from desyncing them silently — the two files cannot import
 * from each other without coupling a marketing card to a mockup, so the
 * agreement is asserted here instead.
 */
import {
  OPPORTUNITIES_BY_DOMAIN,
  TOTAL_OPPORTUNITIES,
  LADDER,
  P2P_DOMAINS,
  P2P_OVERALL_SCORE,
  bandFor,
  DEFAULT_DOMAIN_ID,
} from "@/lib/capability-domains";

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: unknown) => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`); }
};

console.log("\n=== the 42 invariant ===");
{
  const sum = P2P_DOMAINS.reduce((n, d) => n + d.score, 0);
  check("ten domains", P2P_DOMAINS.length === 10, P2P_DOMAINS.length);
  check("scores sum to 420", sum === 420, sum);
  check("mean is EXACTLY 42 (integer, no rounding)", sum / P2P_DOMAINS.length === 42, sum / P2P_DOMAINS.length);
  check("P2P_OVERALL_SCORE is 42 — the DashboardShot tile-1 org score", P2P_OVERALL_SCORE === 42, P2P_OVERALL_SCORE);
}

console.log("\n=== T2 tile: one column per domain, summing to the tile value ===");
{
  check("one opportunity count per capability domain",
    OPPORTUNITIES_BY_DOMAIN.length === P2P_DOMAINS.length,
    { counts: OPPORTUNITIES_BY_DOMAIN.length, domains: P2P_DOMAINS.length });
  check("they sum to 23 — the number printed on the tile",
    TOTAL_OPPORTUNITIES === 23, TOTAL_OPPORTUNITIES);
  check("every count is a positive integer",
    OPPORTUNITIES_BY_DOMAIN.every((v) => Number.isInteger(v) && v > 0), OPPORTUNITIES_BY_DOMAIN);
}

console.log("\n=== shape ===");
{
  check("every domain has exactly 4 KPIs", P2P_DOMAINS.every((d) => d.kpis.length === 4),
    P2P_DOMAINS.filter((d) => d.kpis.length !== 4).map((d) => d.id));
  check("every domain has a suggestion", P2P_DOMAINS.every((d) => d.suggestion.trim().length > 20));
  check("ids are unique", new Set(P2P_DOMAINS.map((d) => d.id)).size === 10);
  check("scores are 0-100", P2P_DOMAINS.every((d) => d.score >= 0 && d.score <= 100));
  check("every dir is up or dn", P2P_DOMAINS.every((d) => d.kpis.every((k) => k.dir === "up" || k.dir === "dn")));
  check("the default domain exists", P2P_DOMAINS.some((d) => d.id === DEFAULT_DOMAIN_ID), DEFAULT_DOMAIN_ID);
  check("the default is Purchase Order Management at 72",
    P2P_DOMAINS.find((d) => d.id === DEFAULT_DOMAIN_ID)?.score === 72);
}

console.log("\n=== ladder bands: Initial 0-25 · Developing 26-50 · Optimized 51-80 · Leading 81-100 ===");
{
  const cases: [number, string][] = [[0,"Initial"],[25,"Initial"],[26,"Developing"],[50,"Developing"],
                                     [51,"Optimized"],[80,"Optimized"],[81,"Leading"],[100,"Leading"]];
  for (const [n, want] of cases) check(`${n} -> ${want}`, bandFor(n) === want, bandFor(n));
  check("every band name is on the rendered ladder",
    P2P_DOMAINS.every((d) => (LADDER as readonly string[]).includes(bandFor(d.score))));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
