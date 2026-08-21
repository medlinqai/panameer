/**
 * `check:assessment-instance` — the three defects this brief closed, pinned
 * (brief_assessment_instance_model WS4).
 *
 * All three are STRUCTURAL. None of them is a function returning a wrong value,
 * which is why `check:assessment` (43 arithmetic assertions) was green the whole
 * time these were true:
 *
 *   1  THE REPORT MUST NOT RE-SCORE. Every per-domain rung, dollar range and
 *      rank was recomputed on every render, so moving a judgement weight in
 *      `DOLLAR_WEIGHTS` silently rewrote every report ever sent.
 *   2  `company_id` MUST COME FROM `getCompanyBinding`. `Person.company_id` is
 *      the signup placeholder; reading it as a company binding is
 *      `P1-J1.2-E003`, and this is the second surface where it could happen.
 *   3  THE DOMAIN ROWS MUST BE IN THE ASSESSMENT'S TRANSACTION. A stored
 *      assessment whose report shows three of ten domains is worse than a
 *      submission the visitor retries, because nothing downstream can tell it
 *      is incomplete.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN — this file's own prose names every
 * forbidden token, and a scanner that read comments would fail on its own
 * documentation. The fix for that is always to weaken the scanner.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { domainRowsFor } from "@/lib/assessment/domain-results";
import { DOLLAR_WEIGHTS, UNWEIGHTED_DOMAINS, type Scored } from "@/lib/assessment/scoring";
import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const ALL = [...walk("src"), ...walk("prisma").filter((f) => /\.ts$/.test(f)), ...walk("scripts")];
const SELF = join("scripts", "check-assessment-instance.ts");
const bodies = new Map(
  ALL.filter((f) => f !== SELF).map((f) => [f, stripComments(readFileSync(f, "utf8"))])
);

const REPORT = join("src", "lib", "assessment", "report.ts");
const SUBMIT = join("src", "app", "api", "assessment", "route.ts");
const HELPER = join("src", "lib", "assessment", "domain-results.ts");
const CLAIM = join("src", "app", "assess", "claim", "[token]", "page.tsx");
const BACKFILL = join("prisma", "backfill-assessment-domains.ts");

for (const f of [REPORT, SUBMIT, HELPER, CLAIM, BACKFILL]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const report = bodies.get(REPORT) ?? "";
const submit = bodies.get(SUBMIT) ?? "";
const helper = bodies.get(HELPER) ?? "";
const claim = bodies.get(CLAIM) ?? "";
const backfill = bodies.get(BACKFILL) ?? "";

// ---------------------------------------------------------------------------
// GUARD 1 — the report reads stored rows; it does not re-score
// ---------------------------------------------------------------------------

check(
  "GUARD 1 — buildReport SELECTS the stored domain rows",
  /domainResults:\s*\{\s*orderBy/.test(report)
);
check(
  "GUARD 1 — the stored rows are the PRIMARY path",
  /a\.domainResults\.length\s*>\s*0[\s\S]{0,200}scoredFromStored\(/.test(report)
);
/*
  The recompute must survive, and it must be REACHABLE ONLY as the else of that
  test. Asserting the ternary shape rather than "scoreAssessment is absent" is
  deliberate: the brief says do not delete the fallback, so its presence is
  required and its POSITION is what matters.
*/
check(
  "GUARD 1 — scoreAssessment survives, but only as the fallback branch",
  /a\.domainResults\.length\s*>\s*0[\s\S]{0,240}:\s*scoreAssessment\(/.test(report)
);
check(
  "GUARD 1 — and it is called exactly once in the report path",
  (report.match(/scoreAssessment\(/g) ?? []).length === 1,
  `found ${(report.match(/scoreAssessment\(/g) ?? []).length}`
);

/*
  ⚠ NOBODY ELSE MAY SCORE AT RENDER TIME. Two callers are legitimate and named:
  the SUBMIT route (scoring at submit is the point) and the BACKFILL (which
  reconstructs, and says so on every row it writes).
*/
/*
  ⚠ `check-assessment-volume.ts` JOINED THIS LIST, AND IT IS THE SAME CATEGORY AS
  `scoring.test.ts` — a HARNESS, not a render path. `brief_per_domain_volume` WS5
  requires an assertion that a fixed input produces a byte-identical `Scored` with
  and without the new per-domain answers, and that assertion cannot be written
  without calling the scorer. The property this guard protects — that no component,
  page or lib re-scores at render time — is untouched: every name here is either the
  scorer itself, the two writers, or a test.
*/
const SCORE_ALLOWED = new Set([
  REPORT,
  SUBMIT,
  BACKFILL,
  join("src", "lib", "assessment", "scoring.ts"),
  join("src", "lib", "assessment", "scoring.test.ts"),
  join("scripts", "check-assessment-volume.ts"),
]);
const rogueScorers = [...bodies.entries()]
  .filter(([f]) => !SCORE_ALLOWED.has(f))
  .filter(([, b]) => /\bscoreAssessment\s*\(/.test(b))
  .map(([f]) => f);
check(
  "GUARD 1 — no other file scores an assessment",
  rogueScorers.length === 0,
  rogueScorers.join(", ")
);
/* And specifically: nothing that RENDERS may even import it. */
const renderScorers = [...bodies.entries()]
  .filter(([f]) => f.startsWith(join("src", "components")))
  .filter(([, b]) => /scoreAssessment/.test(b))
  .map(([f]) => f);
check(
  "GUARD 1 — no component imports the scorer at all",
  renderScorers.length === 0,
  renderScorers.join(", ")
);

// ---------------------------------------------------------------------------
// GUARD 2 — company_id comes from getCompanyBinding, never Person.company_id
// ---------------------------------------------------------------------------

check(
  "GUARD 2 — the resolver goes through getCompanyBinding",
  /getCompanyBinding\s*\(/.test(helper)
);
check(
  "GUARD 2 — and only an APPROVED membership counts",
  /binding\.status\s*!==\s*"APPROVED"/.test(helper)
);
check(
  "GUARD 2 — a failure to resolve returns null rather than throwing",
  /catch\s*\([\s\S]{0,200}return null/.test(helper)
);

/*
  ⚠ THE DEFECT CLASS, STATED AS A BAN. Any file that writes an assessment's
  `company_id` must get it from the resolver, and must not so much as mention a
  person's own `company_id` column while doing it.
*/
const PLACEHOLDER_READ = /\bperson\w*\??\.\s*company_id\b|\bPerson\.company_id\b|person:\s*\{\s*select:\s*\{[^}]*company_id/i;
const assessmentWriters = [...bodies.entries()].filter(([, b]) =>
  /prisma\.assessment\.(create|update)|tx\.assessment\.(create|update)/.test(b)
);
check(
  "GUARD 2 — the guard can see the writers",
  assessmentWriters.length >= 2,
  `found ${assessmentWriters.length}`
);
const badWriters = assessmentWriters
  .filter(([, b]) => /company_id\s*:/.test(b))
  .filter(([, b]) => !/resolveAssessmentCompanyId/.test(b) || PLACEHOLDER_READ.test(b))
  .map(([f]) => f);
check(
  "GUARD 2 — every writer of assessment.company_id uses the resolver and never the placeholder",
  badWriters.length === 0,
  badWriters.join(", ")
);
/*
  ⚠ AND THE CLAIM IS WHERE IT ACTUALLY GETS SET for the funnel's main path — a
  visitor with no account fills the form, then claims. If `user_id` were stamped
  without `company_id` beside it, the column would be dead for every anonymous
  submission, which is most of them.
*/
check(
  "GUARD 2 — the claim stamps company_id in the same update as user_id",
  /user_id:\s*user\.id,[\s\S]{0,160}company_id:\s*await resolveAssessmentCompanyId\(/.test(claim)
);
check(
  "GUARD 2 — and a null company never blocks the claim",
  !/if\s*\(!?\s*companyId?\s*\)[\s\S]{0,60}(notFound|throw|return null)/.test(claim)
);

const placeholderReaders = [REPORT, SUBMIT, HELPER, CLAIM, BACKFILL].filter((f) =>
  PLACEHOLDER_READ.test(bodies.get(f) ?? "")
);
check(
  "GUARD 2 — no assessment file reads a Person's own company_id column",
  placeholderReaders.length === 0,
  placeholderReaders.join(", ")
);

// ---------------------------------------------------------------------------
// GUARD 3 — the domain rows are written inside the assessment's transaction
// ---------------------------------------------------------------------------

/*
  ⚠ A WRITE ON THE BARE CLIENT IS THE FAILURE. `prisma.assessmentDomainResult
  .create…` cannot be in the assessment's transaction by construction, so the
  ban is on the token rather than on a shape that needs parsing.
*/
const bareWrites = [...bodies.entries()]
  .filter(([, b]) => /prisma\.assessmentDomainResult\.(create|createMany|upsert|update|updateMany)/.test(b))
  .map(([f]) => f);
check(
  "GUARD 3 — no domain-row write happens on the bare prisma client",
  bareWrites.length === 0,
  bareWrites.join(", ")
);
check(
  "GUARD 3 — the writer takes a handle and writes through it",
  /export async function writeDomainResults\([\s\S]{0,400}tx\.assessmentDomainResult\.createMany/.test(
    helper
  )
);
check(
  "GUARD 3 — the SUBMIT route creates the assessment and its rows in one transaction",
  /prisma\.\$transaction\(async \(tx\) => \{[\s\S]{0,1600}tx\.assessment\.create\([\s\S]{0,1200}writeDomainResults\(tx,/.test(
    submit
  )
);
check(
  "GUARD 3 — the BACKFILL also writes each assessment's rows in a transaction",
  /\$transaction\(async \(tx\) =>[\s\S]{0,160}writeDomainResults\(tx,/.test(backfill)
);
check(
  "GUARD 3 — the backfill marks every row it writes as reconstructed",
  /writeDomainResults\(tx,[\s\S]{0,80}backfilled:\s*true/.test(backfill)
);
check(
  "GUARD 3 — the backfill SKIPS assessments that already have rows",
  /_count\.domainResults\s*>\s*0[\s\S]{0,300}continue/.test(backfill)
);

// ---------------------------------------------------------------------------
// The pure row builder
// ---------------------------------------------------------------------------

const scoredFixture = (): Scored => ({
  maturityPct: 29,
  unknownDomains: ["supplier_risk"],
  domains: P2P_DOMAINS.map((d, i) => ({
    key: d.key,
    name: d.name,
    formal: d.formal,
    rung: d.key === "supplier_risk" ? null : 10,
    opportunity: d.key === "supplier_risk" ? [0, 0] : [1_000 * (i + 1), 2_000 * (i + 1)],
    rank: d.key === "supplier_risk" ? null : i + 1,
  })),
  ranked: [],
  opportunity: [0, 0],
  investment: [0, 0],
  leapfrog: false,
});

const rows = domainRowsFor(scoredFixture(), new Map([["invoices", "cd-invoices"]]));

check("rows: one per domain in the bank", rows.length === P2P_DOMAINS.length, `${rows.length}`);
check(
  "rows: a resolvable key gets its FK",
  rows.find((r) => r.domain_key === "invoices")?.capability_domain_id === "cd-invoices"
);
check(
  "rows: an UNRESOLVABLE key writes the row with a null FK rather than failing",
  rows.filter((r) => r.capability_domain_id === null).length === P2P_DOMAINS.length - 1
);
check(
  "rows: a 'Not sure' answer is a ROW with a null rung, not a missing row",
  (() => {
    const r = rows.find((x) => x.domain_key === "supplier_risk");
    return Boolean(r) && r!.rung === null;
  })()
);
check(
  "rows: both ends of the dollar range are stored",
  rows.every((r) => r.opportunity_low_cents !== undefined && r.opportunity_high_cents !== undefined)
);
check(
  "rows: the range is stored as BigInt",
  rows.every((r) => typeof r.opportunity_low_cents === "bigint")
);
check(
  "rows: rank is carried through rather than re-derived",
  rows.find((r) => r.domain_key === P2P_DOMAINS[0].key)?.rank === 1
);
/*
  ⚠ THE TWO ENABLER DOMAINS WRITE weight_bps = 0, and that is correct and
  honest, not a missing weight. `DOLLAR_WEIGHTS` is asserted elsewhere to sum to
  exactly 1.0, so giving them a share would rescale all eight and change the
  dollar figure on every report ever produced. Scott's call, explicitly reserved.
*/
for (const key of UNWEIGHTED_DOMAINS) {
  check(
    `rows: the unweighted domain "${key}" stores weight_bps = 0`,
    rows.find((r) => r.domain_key === key)?.weight_bps === 0
  );
}
check(
  "rows: the weighted domains' basis points still sum to 10000",
  rows.reduce((n, r) => n + (r.weight_bps ?? 0), 0) === 10_000,
  `${rows.reduce((n, r) => n + (r.weight_bps ?? 0), 0)}`
);
check(
  "rows: every DOLLAR_WEIGHTS entry survives the bps conversion exactly",
  Object.entries(DOLLAR_WEIGHTS).every(
    ([k, w]) => rows.find((r) => r.domain_key === k)?.weight_bps === Math.round(w * 10_000)
  )
);
check(
  "rows: default backfilled = false — a submit-time row is not marked reconstructed",
  rows.every((r) => r.backfilled === false)
);
check(
  "rows: the backfill flag can be set",
  domainRowsFor(scoredFixture(), new Map(), true).every((r) => r.backfilled === true)
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:assessment-instance — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:assessment-instance — ${pass}/${pass} passed`);
