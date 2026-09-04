import path from "node:path";
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { extractText, mimeFromName } from "../src/lib/resume/extract";
import {
  aiExtractResume,
  aiToParsedResume,
  aiExtractionAvailable,
} from "../src/lib/resume/ai-extract";
import { resolveProvider, parserConfigProblem } from "../src/lib/resume/ai-provider";

/**
 * THE PARSER EVAL (brief_j14 WS-A acceptance + WS-G).
 *
 *   npm run eval:parser              measure the banked fixtures
 *   npm run eval:parser -- --save    write the current output as expected
 *
 * WHAT IT ANSWERS, in one table: per-field accuracy against a saved expectation,
 * average $/parse, and latency. Those are the three numbers that decide whether
 * a cheaper model is actually cheaper, and running them by hand across four
 * documents is how a "quality is fine" claim goes unchecked.
 *
 * IT SPENDS MONEY — one model call per fixture — so it is a script you run
 * deliberately, never part of a build.
 *
 * The fixtures are REAL RÉSUMÉS and are gitignored. The expectation file is
 * derived from them, so it is gitignored too: it contains named people's
 * employment history, and a repo is the wrong place for that.
 */

const FIX_DIR = path.join(process.cwd(), "src/lib/resume/__fixtures__");
const EXPECTED = path.join(FIX_DIR, "expected-parses.json");

type FieldCounts = { hit: number; total: number };

type Expectation = {
  headline: string | null;
  employers: { employer: string; roleTitle: string; startDate: string | null }[];
  education: { institution: string; degree: string | null }[];
  skills: string[];
};

const norm = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

/** Set-overlap: how much of `expected` the run reproduced. */
function overlap(expected: string[], actual: string[]): FieldCounts {
  const have = new Set(actual.map(norm));
  const hit = expected.filter((e) => have.has(norm(e))).length;
  return { hit, total: expected.length };
}

async function main() {
  const save = process.argv.includes("--save");

  const problem = parserConfigProblem();
  if (problem) console.warn(`⚠  ${problem}\n`);

  if (!aiExtractionAvailable()) {
    console.error(
      "No parser configured. Set RESUME_PARSER_PROVIDER/_API_KEY/_MODEL (or ANTHROPIC_API_KEY)\n" +
        "in .env.local and run again. Nothing was called; no cost was incurred."
    );
    process.exit(1);
  }
  const cfg = resolveProvider()!;
  console.log(`provider=${cfg.provider}  model=${cfg.model}\n`);

  if (!existsSync(FIX_DIR)) {
    console.error(`No fixtures directory at ${FIX_DIR}.`);
    process.exit(1);
  }
  // `--only a,b` runs a subset. Every call costs money, so iterating on the
  // prompt across four documents should not mean paying for fifteen.
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice(7).split(",").map((x) => x.trim()) : null;
  const files = readdirSync(FIX_DIR)
    .filter((f) => /\.(pdf|docx|doc|rtf|txt)$/i.test(f))
    .filter((f) => !only || only.some((o) => f.includes(o)))
    .sort();
  if (files.length === 0) {
    console.error("No résumé fixtures found.");
    process.exit(1);
  }

  const expected: Record<string, Expectation> = existsSync(EXPECTED)
    ? JSON.parse(readFileSync(EXPECTED, "utf8"))
    : {};
  const produced: Record<string, Expectation> = {};

  let costTotal = 0;
  let costKnown = 0;
  let msTotal = 0;
  let inTotal = 0;
  let outTotal = 0;
  const totals: Record<string, FieldCounts> = {
    headline: { hit: 0, total: 0 },
    employers: { hit: 0, total: 0 },
    roles: { hit: 0, total: 0 },
    education: { hit: 0, total: 0 },
    skills: { hit: 0, total: 0 },
  };

  const rows: string[][] = [];

  for (const file of files) {
    const bytes = readFileSync(path.join(FIX_DIR, file));
    let text: string;
    try {
      text = await extractText(bytes, mimeFromName(file) ?? "application/octet-stream", file);
    } catch (e) {
      rows.push([file, "—", "—", "—", `extract failed: ${(e as Error).message.slice(0, 40)}`]);
      continue;
    }

    const out = await aiExtractResume(text);
    if (!out.ok) {
      rows.push([file, "—", "—", "—", `parse failed: ${out.message.slice(0, 48)}`]);
      continue;
    }

    const parsed = aiToParsedResume(out.data);
    msTotal += out.ms;
    inTotal += out.usage.inputTokens;
    outTotal += out.usage.outputTokens;
    if (out.usage.costUsd != null) {
      costTotal += out.usage.costUsd;
      costKnown += 1;
    }

    const mine: Expectation = {
      headline: parsed.headline,
      employers: parsed.experiences.map((e) => ({
        /* ⚠ `null` -> `""` FOR THE FIXTURE FILE ONLY (`P1-J1.4-E373`). The
           expectation JSON is a string-comparison artefact, not product data. */
        employer: e.employer ?? "",
        roleTitle: e.roleTitle,
        startDate: e.startDate,
      })),
      education: parsed.education.map((e) => ({
        institution: e.institution,
        degree: e.degree ?? null,
      })),
      skills: parsed.skills,
    };
    produced[file] = mine;

    const exp = expected[file];
    let accuracy = "(no expectation)";
    if (exp) {
      const emp = overlap(
        exp.employers.map((e) => e.employer),
        mine.employers.map((e) => e.employer)
      );
      const rol = overlap(
        exp.employers.map((e) => e.roleTitle).filter(Boolean),
        mine.employers.map((e) => e.roleTitle)
      );
      const edu = overlap(
        exp.education.map((e) => e.institution),
        mine.education.map((e) => e.institution)
      );
      const skl = overlap(exp.skills, mine.skills);
      const head = { hit: norm(exp.headline) === norm(mine.headline) ? 1 : 0, total: 1 };

      for (const [k, v] of Object.entries({ headline: head, employers: emp, roles: rol, education: edu, skills: skl })) {
        totals[k].hit += v.hit;
        totals[k].total += v.total;
      }
      const all = [head, emp, rol, edu, skl].reduce(
        (a, b) => ({ hit: a.hit + b.hit, total: a.total + b.total }),
        { hit: 0, total: 0 }
      );
      accuracy = all.total ? `${((all.hit / all.total) * 100).toFixed(0)}%` : "—";
    }

    rows.push([
      file,
      `${out.usage.inputTokens}/${out.usage.outputTokens}`,
      out.usage.costUsd != null ? `$${out.usage.costUsd.toFixed(5)}` : "n/a",
      `${(out.ms / 1000).toFixed(1)}s`,
      accuracy,
    ]);
  }

  const head = ["fixture", "tok in/out", "cost", "latency", "accuracy"];
  const widths = head.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length))
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ");
  console.log(line(head));
  console.log(widths.map((w) => "─".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));

  console.log("");
  /*
    READ THESE WITH THE VARIANCE IN MIND. `employers` and `education` are stable
    between identical runs; `roles`, `headline` and `skills` are exact-string
    overlap on free text and swing 20–30 points because the model rephrases a
    title. Treat a single run's number as a smoke test, not a verdict.
  */
  for (const [k, v] of Object.entries(totals)) {
    if (v.total === 0) continue;
    console.log(`  ${k.padEnd(10)} ${((v.hit / v.total) * 100).toFixed(0)}%  (${v.hit}/${v.total})`);
  }
  const parsedCount = rows.filter((r) => r[2] !== "—").length;
  console.log("");
  if (costKnown > 0) {
    const avg = costTotal / costKnown;
    console.log(`  avg $/parse   $${avg.toFixed(5)}   (${(1 / avg).toFixed(0)} parses per $1)`);
    console.log(`  target        $0.00330    (~300 per $1)`);
    console.log(`  ${avg <= 0.0033 ? "✓ within target" : "✗ OVER target"}`);
  } else {
    console.log("  avg $/parse   not computed — set RESUME_PARSER_PRICE_IN_PER_M and _OUT_PER_M");
  }
  if (parsedCount) console.log(`  avg latency   ${(msTotal / parsedCount / 1000).toFixed(1)}s`);

  /*
    THE PROJECTION TABLE.

    Token counts are a property of the prompt and the documents; prices are a
    property of whichever model you point at them. Printing measured tokens
    against named price points shows WHICH of the two is standing between the
    run and the target — and on these fixtures it is output tokens, every time.
    Arithmetic in the open beats a single number nobody can check.
  */
  if (parsedCount) {
    const avgIn = inTotal / parsedCount;
    const avgOut = outTotal / parsedCount;
    console.log(`  avg tokens    ${avgIn.toFixed(0)} in / ${avgOut.toFixed(0)} out`);
    console.log("\n  projected $/parse at these token counts:");
    const points: [string, number, number][] = [
      ["economy   ($0.20/$1.20 per M)", 0.2, 1.2],
      ["flash-lite($0.30/$2.50 per M)", 0.3, 2.5],
      ["incumbent ($3.00/$15.00 per M)", 3, 15],
    ];
    for (const [label, pin, pout] of points) {
      const c = (avgIn / 1e6) * pin + (avgOut / 1e6) * pout;
      const per$ = 1 / c;
      console.log(
        `    ${label}  $${c.toFixed(5)}  (${per$.toFixed(0)}/$1)  ${c <= 0.0033 ? "✓" : "✗ over target"}`
      );
    }
  }

  if (save) {
    writeFileSync(EXPECTED, JSON.stringify(produced, null, 2));
    console.log(`\nwrote ${Object.keys(produced).length} expectations → ${EXPECTED}`);
    console.log("(gitignored — it is derived from real people's résumés)");
  }
}

void main();
