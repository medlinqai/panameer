import { prisma } from "@/lib/prisma";
import { scoreAssessment, type Answers, type Basics } from "@/lib/assessment/scoring";
import { writeDomainResults } from "@/lib/assessment/domain-results";

/**
 * BACKFILL `AssessmentDomainResult` FOR EVERY EXISTING ASSESSMENT
 * (brief_assessment_instance_model WS3).
 *
 * ── ⚠ THIS RECONSTRUCTS, IT DOES NOT RECOVER ─────────────────────────────────
 *
 * The rows are recomputed from each assessment's stored `answers` using TODAY's
 * `DOLLAR_WEIGHTS`. The weights in force when those reports were shown were
 * NEVER RECORDED anywhere, so there is no way to reproduce them. That is
 * unavoidable, and it must be visible rather than papered over: every row this
 * script writes carries `backfilled = true`, so anyone reading a historical
 * breakdown knows it was rebuilt after the fact and may not match what the
 * recipient was emailed.
 *
 * ── IDEMPOTENT BY SKIPPING, NOT BY OVERWRITING ───────────────────────────────
 *
 * An assessment that already has domain rows is LEFT ALONE. Re-running must not
 * rewrite rows that were frozen at submit with the weights of their own day —
 * that is precisely the harm the table exists to prevent, and a "refresh" flag
 * would be a loaded gun. If rows are ever genuinely wrong, delete them
 * deliberately and re-run.
 *
 * ── ONE TRANSACTION PER ASSESSMENT ───────────────────────────────────────────
 *
 * Same rule as the submit route: an assessment's rows land completely or not at
 * all. A partially backfilled assessment would read as a complete one, because
 * the report has no way to tell "three domains" from "three of ten".
 *
 * Run:  npm run backfill:assessment-domains
 */
async function main() {
  const dryRun = !process.argv.includes("--apply");

  const before = await prisma.assessmentDomainResult.count();
  const assessments = await prisma.assessment.findMany({
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      created_at: true,
      company_name: true,
      company_id: true,
      process: true,
      score_pct: true,
      answers: true,
      revenue_band: true,
      ebitda_band: true,
      platform: true,
      state: true,
      _count: { select: { domainResults: true } },
    },
  });

  console.log(`${dryRun ? "DRY RUN (pass --apply to write)" : "APPLYING"}`);
  console.log(`assessments: ${assessments.length}`);
  console.log(`assessment_domain_results BEFORE: ${before}`);

  let written = 0;
  let skipped = 0;
  let nullFk = 0;
  const nullFkKeys = new Map<string, number>();
  const scoreDrift: string[] = [];

  for (const a of assessments) {
    if (a._count.domainResults > 0) {
      skipped += 1;
      console.log(`  skip ${a.id.slice(0, 8)} — already has ${a._count.domainResults} row(s)`);
      continue;
    }

    const answers = (a.answers ?? {}) as unknown as Answers;
    const basics: Basics = {
      revenueBand: a.revenue_band,
      ebitdaBand: a.ebitda_band,
      platform: a.platform,
      state: a.state,
    };
    const scored = scoreAssessment(answers, basics);

    /*
      ⚠ REPORTED, NOT CORRECTED. If a recompute today disagrees with the
      `score_pct` frozen at submit, the two are printing different numbers for the
      same assessment and that is a finding — the backfill must not "fix" the
      stored score to match today's code.
    */
    if (scored.maturityPct !== a.score_pct) {
      scoreDrift.push(
        `${a.id.slice(0, 8)} stored score_pct=${a.score_pct} recompute=${scored.maturityPct}`
      );
    }

    const keys = scored.domains.map((d) => d.key);
    const resolvable = await prisma.capabilityDomain.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    });
    const known = new Set(resolvable.map((r) => r.key));
    for (const k of keys) {
      if (!known.has(k)) {
        nullFk += 1;
        nullFkKeys.set(k, (nullFkKeys.get(k) ?? 0) + 1);
      }
    }

    if (dryRun) {
      console.log(
        `  would write ${scored.domains.length} row(s) for ${a.id.slice(0, 8)} ${JSON.stringify(a.company_name)}`
      );
      written += scored.domains.length;
      continue;
    }

    const n = await prisma.$transaction(async (tx) =>
      writeDomainResults(tx, a.id, scored, { backfilled: true })
    );
    written += n;
    console.log(`  wrote ${n} row(s) for ${a.id.slice(0, 8)} ${JSON.stringify(a.company_name)}`);
  }

  const after = await prisma.assessmentDomainResult.count();
  console.log(`\nrows ${dryRun ? "that WOULD be written" : "written"}: ${written}`);
  console.log(`assessments skipped (already had rows): ${skipped}`);
  console.log(`assessment_domain_results AFTER: ${after}`);
  console.log(
    `rows with an UNRESOLVABLE domain key (null capability_domain_id): ${nullFk}` +
      (nullFk > 0 ? ` — ${[...nullFkKeys.entries()].map(([k, c]) => `${k} x${c}`).join(", ")}` : "")
  );
  if (scoreDrift.length > 0) {
    console.log(`\n⚠ SCORE DRIFT — a recompute disagrees with the frozen score_pct:`);
    for (const d of scoreDrift) console.log(`   ${d}`);
  } else {
    console.log(`score_pct drift: none — every recompute matches the frozen score`);
  }

  /* Scott's actual requirement, proven rather than asserted. */
  const withCompany = await prisma.assessment.count({ where: { company_id: { not: null } } });
  console.log(`\nassessments with a resolvable company_id: ${withCompany} / ${assessments.length}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
