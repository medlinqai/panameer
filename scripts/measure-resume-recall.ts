/**
 * `measure:resume-recall` — DID THE PARSER GET BETTER? (`P1-A1.4-E399` WS-6)
 *
 * Scott, 2026-09-08: *"I want to see if the parser is improving when I give it
 * the next resume."* Before this, he could not.
 *
 * ── ⚠⚠ A MEASUREMENT, NOT A GATE ────────────────────────────────────────────
 *
 * ⚠ IT SPENDS REAL MONEY on every run, so it is `measure:*` and not `check:*`,
 * and it is wired into no merge gate. The name is the safeguard — a `check:`
 * prefix is what somebody later adds to CI without thinking about the bill.
 *
 * ⚠⚠ IT RUNS THE **CONFIGURED PRODUCTION MODEL**, whatever that is.
 * `resolveProvider()` prefers the economy tier when `RESUME_PARSER_API_KEY` and
 * `RESUME_PARSER_MODEL` are both set, so this proves what actually ships. Proving
 * a model the product does not run is worse than not testing, because it reads
 * as coverage.
 *
 * ── ⚠⚠ DO NOT MOVE THE NUMBERS TO GO GREEN ──────────────────────────────────
 *
 * The expectations below are **what the document contains**, counted off Scott's
 * own colour-coded copy. A case reporting `employers 1/5` is the instrument
 * working. Lowering it to 1 would delete the finding and leave the defect.
 */
import * as path from "node:path";
import * as fs from "node:fs";
import { extractText, mimeFromName } from "@/lib/resume/extract";
import { aiExtractResume, aiToParsedResume } from "@/lib/resume/ai-extract";
import { aiExtractResumeMultiPass, countDateRanges } from "@/lib/resume/ai-passes";
import { resolveProvider } from "@/lib/resume/ai-provider";

const DIR = path.join(process.cwd(), "src/lib/resume/__fixtures__");

/** ⚠ THE ACCEPTANCE NUMBERS, FROM THE DOCUMENT ITSELF — not from a guess. */
type Expect = {
  file: string;
  note: string;
  employers: number;
  projects: number;
  certifications: number;
  education: number;
  overview: boolean;
};

const CASES: Expect[] = [
  {
    file: "scott-new-full.docx",
    /* ⚠ BANKED IN `__fixtures__` SINCE JULY AND NEVER TESTED. The exact document
       that fails has been sitting next to the harness the whole time. */
    note: "the E399 document — 30-year career, projects under 'Additional'",
    employers: 5,
    projects: 14,
    certifications: 5,
    education: 1,
    overview: true,
  },
];

const pct = (got: number, want: number) => (want === 0 ? "—" : `${Math.round((got / want) * 100)}%`);
const line = (label: string, got: number, want: number) =>
  `    ${label.padEnd(16)} ${String(got).padStart(3)}/${String(want).padEnd(3)} ${pct(got, want).padStart(5)}` +
  (got < want ? "  ⚠" : "  ✓");

async function main() {
  const cfg = resolveProvider();
  if (!cfg) {
    console.log("No parser configured — set RESUME_PARSER_API_KEY + RESUME_PARSER_MODEL.");
    process.exit(0);
  }
  console.log(`model: ${cfg.model}  ·  provider: ${cfg.provider}  ·  tier: ${cfg.tier}`);
  console.log("⚠ this run spends money.\n");

  let totalCost = 0;
  for (const c of CASES) {
    const file = path.join(DIR, c.file);
    if (!fs.existsSync(file)) {
      console.log(`${c.file}: MISSING from __fixtures__`);
      continue;
    }
    const buf = fs.readFileSync(file);
    /* ⚠ (bytes, mime, fileName) — the harness resolves the mime from the name. */
    const text = await extractText(buf, mimeFromName(c.file) ?? "", c.file);
    console.log(`${c.file} — ${c.note}`);
    console.log(`  source: ${text.length} chars · ${countDateRanges(text)} date ranges\n`);

    /* ── BEFORE: the single call this brief replaced ─────────────────────── */
    const t0 = Date.now();
    const before = await aiExtractResume(text);
    const beforeMs = Date.now() - t0;
    if (before.ok) {
      const p = aiToParsedResume(before.data);
      totalCost += before.usage.costUsd ?? 0;
      console.log(`  BEFORE — one call  ${beforeMs}ms  $${(before.usage.costUsd ?? 0).toFixed(4)}  finish=${before.usage.finishReason}`);
      console.log(line("employers", p.experiences.length, c.employers));
      console.log(line("projects", p.projects.length, c.projects));
      console.log(line("certifications", p.certifications.length, c.certifications));
      console.log(line("education", p.education.length, c.education));
      console.log(`    ${"overview".padEnd(16)} ${p.overview ? "  yes" : "   no"}       ${p.overview ? " ✓" : " ⚠"}`);
    } else {
      console.log(`  BEFORE — one call FAILED: ${before.reason} ${before.message}`);
    }

    /* ── AFTER: enumerate first, then extract ────────────────────────────── */
    const t1 = Date.now();
    const after = await aiExtractResumeMultiPass(text);
    const afterMs = Date.now() - t1;
    if (after.ok) {
      const p = aiToParsedResume(after.data);
      totalCost += after.usage.costUsd ?? 0;
      console.log(`\n  AFTER — enumerate then extract  ${afterMs}ms  $${(after.usage.costUsd ?? 0).toFixed(4)}`);
      console.log(`    inventory found ${after.recall.headingsFound} headings (the contract)`);
      console.log(line("employers", p.experiences.length, c.employers));
      console.log(line("projects", p.projects.length, c.projects));
      console.log(line("certifications", p.certifications.length, c.certifications));
      console.log(line("education", p.education.length, c.education));
      console.log(`    ${"overview".padEnd(16)} ${p.overview ? "  yes" : "   no"}       ${p.overview ? " ✓" : " ⚠"}`);
      console.log(`\n  per pass:`);
      for (const q of after.passes)
        console.log(`    ${q.name.padEnd(15)} ${q.ok ? "ok  " : "FAIL"} ${String(q.ms).padStart(6)}ms  $${(q.costUsd ?? 0).toFixed(4)}`);
      if (after.recall.warnings.length) {
        console.log(`\n  ⚠ what the import would TELL THE PERSON (WS-3):`);
        for (const w of after.recall.warnings) console.log(`    "${w}"`);
      } else {
        console.log(`\n  ✓ no shortfall detected`);
      }
    } else {
      console.log(`\n  AFTER FAILED: ${after.reason} ${after.message}`);
    }
    console.log("");
  }
  console.log(`total cost for this run: $${totalCost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
