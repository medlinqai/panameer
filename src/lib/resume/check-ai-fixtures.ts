/**
 * WS5 — the AI tier, proved against the real banked résumés.
 *
 *   npm run check:ai-fixtures
 *
 * SPENDS MONEY. It makes one model call per fixture, which is why it is a
 * separate script rather than part of `check:resume`: the free harness must stay
 * runnable on every change, and this one is run deliberately.
 *
 * With no `ANTHROPIC_API_KEY` it SKIPS with a note and exits 0. That is the same
 * degradation the product has — no key means no AI tier, not a broken build —
 * and a harness that failed CI for an unconfigured optional feature would be
 * wrong in the same way.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractText, mimeFromName } from "./extract";
import { parseResume } from "./parse";
import { assessParse } from "./confidence";
import { aiExtractResume, aiToParsedResume, aiExtractionAvailable } from "./ai-extract";

const DIR = path.join(process.cwd(), "src/lib/resume/__fixtures__");

type Case = {
  file: string;
  note: string;
  /** What the AI pass must find. These are the brief's acceptance numbers. */
  minEmployers: number;
  /** Distinct employer/client names — the tell that entries aren't duplicates. */
  minDistinctNames: number;
  minDated: number;
  expectHeuristicConfidence: "high" | "low";
};

const CASES: Case[] = [
  {
    file: "eddie.docx",
    note: "paragraph résumé, 'Career Experience', 7 employers",
    minEmployers: 7,
    minDistinctNames: 7,
    minDated: 4,
    // Walk6b taught the heuristic this layout, so the GATE won't route him here —
    // this run is the explicit comparison the brief asks for.
    expectHeuristicConfidence: "high",
  },
  {
    file: "marelise-eur.docx",
    note: "10 project tables the heuristic reads as nothing",
    minEmployers: 10,
    minDistinctNames: 8,
    minDated: 8,
    expectHeuristicConfidence: "low",
  },
];

let pass = 0;
let fail = 0;
const assert = (cond: boolean, label: string, detail?: unknown) => {
  if (cond) {
    pass++;
    console.log(`    PASS  ${label}`);
  } else {
    fail++;
    console.log(`    FAIL  ${label}${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ""}`);
  }
};

async function run() {
  if (!aiExtractionAvailable()) {
    console.log(
      "SKIPPED — ANTHROPIC_API_KEY is not set.\n" +
        "  The AI tier is unproven against the fixtures until it is. Set the key in\n" +
        "  .env.local and re-run; nothing else needs to change.\n" +
        "  (The product degrades the same way: no key, no AI button, heuristic stands.)"
    );
    return;
  }

  for (const c of CASES) {
    const full = path.join(DIR, c.file);
    if (!existsSync(full)) {
      console.log(`SKIP  ${c.file} — not present locally`);
      continue;
    }
    console.log(`\n### ${c.file} — ${c.note}`);

    const text = await extractText(readFileSync(full), mimeFromName(c.file) ?? "", c.file);
    const heuristic = parseResume(text);
    const conf = assessParse(text, heuristic);
    console.log(
      `  heuristic: ${heuristic.experiences.length} roles, confidence ${conf.score}` +
        (conf.reasons.length ? ` (${conf.reasons[0]})` : "")
    );
    assert(
      conf.score === c.expectHeuristicConfidence,
      `gate routes as expected (${c.expectHeuristicConfidence})`,
      conf.score
    );

    const outcome = await aiExtractResume(text);
    if (!outcome.ok) {
      assert(false, `AI extraction succeeded`, outcome.message);
      continue;
    }
    const parsed = aiToParsedResume(outcome.data);
    console.log(
      `  AI (${outcome.model}, ${outcome.ms}ms): ${outcome.data.employers.length} employers, ` +
        `${outcome.data.projects.length} projects → ${parsed.experiences.length} entries`
    );
    for (const e of parsed.experiences) {
      console.log(
        `    · ${JSON.stringify(e.employer)} — ${JSON.stringify(e.roleTitle)} ${e.startDate ?? "?"} → ${e.endDate ?? "present"}`
      );
    }

    const names = new Set(parsed.experiences.map((e) => e.employer.trim().toLowerCase()));
    const dated = parsed.experiences.filter((e) => e.startDate).length;

    assert(parsed.experiences.length >= c.minEmployers, `≥${c.minEmployers} entries`, parsed.experiences.length);
    assert(names.size >= c.minDistinctNames, `≥${c.minDistinctNames} distinct names (not duplicates)`, names.size);
    assert(dated >= c.minDated, `≥${c.minDated} carry dates`, dated);
    assert(
      parsed.experiences.every((e) => e.employer.trim().length > 0),
      "every entry names an employer or client"
    );
    // The AI result must itself clear the gate, or the panel would reappear on
    // top of a successful AI pass.
    const after = assessParse(text, parsed, { source: "ai" });
    assert(after.score === "high", "the AI result clears the confidence gate", after.reasons);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

void run();
