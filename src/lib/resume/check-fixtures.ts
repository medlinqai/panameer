/**
 * Résumé extraction + parse harness, run against the REAL sample documents
 * (WS-D). `npm run check:resume`.
 *
 * WHY IT IS A SCRIPT AND NOT A UNIT TEST. The fixtures are real people's CVs.
 * They are gitignored and will never be committed, so a test that fails when
 * they are absent would fail for everyone but the person who has them — CI
 * included. This reads whatever is present, SKIPS-WITH-NOTE what isn't, and
 * exits non-zero only on an assertion that actually ran. The point is to be
 * runnable by whoever holds the documents, not to gate a pipeline that can never
 * see them.
 *
 * Copy the résumés from
 *   `4. Project Documents/2. Design/6. Resume Samples for Parser/`
 * into `src/lib/resume/__fixtures__/` using the names below.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractText, mimeFromName, ExtractError, proseRatio } from "./extract";
import { parseResume } from "./parse";
import { matchSkills, suggestableSkills } from "./match";

const DIR = path.join(process.cwd(), "src/lib/resume/__fixtures__");

type Check = {
  file: string;
  note: string;
  /** Expect extraction to REFUSE this file, with a reason the user can act on. */
  expectRefusal?: boolean;
  minChars?: number;
  maxSkills?: number;
  maxEducation?: number;
  minExperiences?: number;
  /** The E055 case: a sidebar rail must not be read as education. */
  maxFalseEducation?: number;
};

/**
 * Bounds, not exact values. A heuristic parser that has to hit an exact count is
 * a parser nobody dares improve; what matters is that the failure MODES stay
 * fixed — no blowouts, no empty extractions, no silent garbage.
 */
const CHECKS: Check[] = [
  // --- 1. Experts -------------------------------------------------------
  {
    file: "scott-old.docx",
    note: "E055 two-column sidebar — the 28-education bug",
    minChars: 8000,
    maxEducation: 3,
    maxFalseEducation: 3,
    maxSkills: 40,
  },
  {
    file: "marelise.docx",
    note: "'zero headings → nothing imported'",
    minChars: 8000,
    maxSkills: 40,
    maxEducation: 12,
  },
  {
    file: "linus-001.docx",
    note: "the other 'nothing imported' case",
    minChars: 5000,
    maxSkills: 40,
    maxEducation: 12,
  },
  // --- 2. Other Providers ----------------------------------------------
  {
    file: "ppm.docx",
    note: "TABLE résumé — WS-A's acceptance case (11 tables)",
    minChars: 4000,
    maxSkills: 40,
    maxEducation: 12,
  },
  {
    file: "ppm-fin-srilakshmi.docx",
    note: "TABLE résumé — WS-A's acceptance case",
    minChars: 4000,
    maxSkills: 40,
    maxEducation: 12,
  },
  {
    file: "epm-ashok.doc",
    note: "legacy .doc — was a 179-skill blowout from binary junk",
    expectRefusal: true,
  },
  {
    file: "fin-chakrahdar.doc",
    note: "legacy .doc — was a 298-skill blowout from binary junk",
    expectRefusal: true,
  },
  {
    file: "fin-rajesh.pdf",
    note: "education blowout (was 14)",
    minChars: 3000,
    maxEducation: 12,
    maxSkills: 40,
  },
  {
    file: "scm-bandi.pdf",
    note: "education blowout (was 9)",
    minChars: 3000,
    maxEducation: 12,
    maxSkills: 40,
  },
  { file: "hcm-ram.docx", note: "skills lost", minChars: 8000, maxSkills: 40 },
  { file: "p2p-atul.docx", note: "general", minChars: 5000, maxSkills: 40 },
  // --- 3. New StratERP style — the healthy baseline ---------------------
  {
    file: "scott-new-full.docx",
    note: "NEW format — must parse CLEAN",
    minChars: 9000,
    minExperiences: 4,
    maxEducation: 4,
    maxSkills: 40,
  },
  {
    file: "scott-new-full.pdf",
    note: "NEW format, PDF — must match the .docx",
    minChars: 9000,
    minExperiences: 4,
    maxEducation: 4,
    maxSkills: 40,
  },
  {
    file: "scott-new-short.docx",
    note: "NEW format, short",
    minChars: 6000,
    minExperiences: 4,
    maxEducation: 4,
    maxSkills: 40,
  },
];

let pass = 0;
let fail = 0;
let skipped = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(label);
  }
}

async function run() {
  console.log(`résumé fixtures: ${DIR}\n`);

  for (const c of CHECKS) {
    const full = path.join(DIR, c.file);
    if (!existsSync(full)) {
      skipped++;
      console.log(`SKIP  ${c.file.padEnd(26)} not present — ${c.note}`);
      continue;
    }

    const bytes = readFileSync(full);
    let text = "";
    let refused: string | null = null;
    try {
      text = await extractText(bytes, mimeFromName(c.file) ?? "", c.file);
    } catch (e) {
      refused = e instanceof ExtractError ? e.code : "THREW";
    }

    if (c.expectRefusal) {
      assert(refused !== null, `${c.file}: expected a refusal, got ${text.length} chars`);
      console.log(
        `${refused ? "ok  " : "FAIL"}  ${c.file.padEnd(26)} refused (${refused ?? "NOT REFUSED"}) — ${c.note}`
      );
      continue;
    }

    if (refused) {
      assert(false, `${c.file}: extraction refused (${refused})`);
      console.log(`FAIL  ${c.file.padEnd(26)} refused (${refused}) — ${c.note}`);
      continue;
    }

    const p = parseResume(text);
    const { unmatched } = matchSkills(p.skills, []);
    const suggested = suggestableSkills(unmatched);

    if (c.minChars) {
      assert(text.length >= c.minChars, `${c.file}: ${text.length} chars < ${c.minChars}`);
    }
    // Extraction that clears the length floor but is really binary junk is the
    // failure the .doc guard exists for; assert the guard's own measure here so
    // a regression shows up as itself rather than as a downstream blowout.
    assert(proseRatio(text) >= 0.6, `${c.file}: prose ratio ${proseRatio(text).toFixed(2)} < 0.6`);
    if (c.maxSkills) {
      assert(p.skills.length <= c.maxSkills, `${c.file}: ${p.skills.length} skills > ${c.maxSkills}`);
    }
    if (c.maxEducation) {
      assert(
        p.education.length <= c.maxEducation,
        `${c.file}: ${p.education.length} education > ${c.maxEducation}`
      );
    }
    if (c.maxFalseEducation) {
      assert(
        p.education.length <= c.maxFalseEducation,
        `${c.file}: ${p.education.length} education entries — sidebar read as education?`
      );
    }
    if (c.minExperiences) {
      assert(
        p.experiences.length >= c.minExperiences,
        `${c.file}: ${p.experiences.length} roles < ${c.minExperiences}`
      );
    }

    console.log(
      `ok    ${c.file.padEnd(26)} ${String(text.length).padStart(6)} chars · ` +
        `exp ${String(p.experiences.length).padStart(2)} · edu ${String(p.education.length).padStart(2)} · ` +
        `skills ${String(p.skills.length).padStart(2)} · suggest ${String(suggested.length).padStart(2)} · ` +
        `gaps ${p.gaps.length}  — ${c.note}`
    );
  }

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped (not present)`);
  if (failures.length) {
    console.log("\nfailures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  process.exitCode = fail ? 1 : 0;
}

void run();
