import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractText, mimeFromName, ExtractError, proseRatio } from "./extract";
import { parseResume } from "./parse";
import { matchSkills, suggestableSkills } from "./match";
import { assessParse } from "./confidence";

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
  maxFalseEducation?: number;
  namedEmployers?: number;
  mustContain?: { text: string; atLeast: number }[];
  mustAppearAtMost?: { text: string; atMost: number }[];
  /** WS0 — the confidence gate's verdict for this fixture. */
  expectConfidence?: "high" | "low";
};

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
  {
    file: "marelise-eur.docx",
    note: "E128 — 10 project TABLES; the heuristic reads none of them",
    minChars: 5000,
    maxSkills: 40,
    expectConfidence: "low",
    // The ten tables' own labels. Their presence proves the cells are extracted;
    // the confidence score proves the PARSER still can't place them, which is
    // the whole reason the AI tier exists.
    mustContain: [
      { text: "Summary", atLeast: 10 },
      { text: "Description", atLeast: 10 },
      { text: "Role-Type", atLeast: 10 },
      { text: "Software", atLeast: 10 },
    ],
  },
  {
    file: "eddie.docx",
    note: "E122 'Career Experience' + two-line company/role blocks",
    minChars: 6000,
    minExperiences: 4, //  the four dated blocks, at minimum
    namedEmployers: 4, // …and every one of them names its company
    // WS0 — Walk6b taught the heuristic this layout, so Eddie is a heuristic
    // WIN and must NOT be escalated to the model.
    expectConfidence: "high",
    maxEducation: 5,
    maxSkills: 40,
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
    note: "TABLE résumé — WS-A's acceptance case; E508 duplication guard",
    minChars: 4000,
    maxSkills: 40,
    maxEducation: 12,
    mustContain: [
      /* The cells must survive — otherwise `atMost` passes vacuously. */
      { text: "Ernst & Young LLC.", atLeast: 1 },
      { text: "Job Synopsis", atLeast: 1 },
    ],
    mustAppearAtMost: [
      { text: "Ernst & Young LLC.,", atMost: 1 },
      { text: "Implementation of PPM for SLK Technologies", atMost: 1 },
    ],
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
    expectConfidence: "high",
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
    const conf = assessParse(text, p);
    const { unmatched } = matchSkills(p.skills, []);

    for (const need of c.mustContain ?? []) {
      const n = (text.match(new RegExp(need.text.replace(/[-]/g, "\\-"), "gi")) ?? []).length;
      assert(
        n >= need.atLeast,
        `${c.file}: "${need.text}" appears ${n}× in the extracted text, want ≥${need.atLeast}`
      );
    }
    for (const cap of c.mustAppearAtMost ?? []) {
      // LITERAL COUNT — the probe strings carry `&`, `.` and `,`, so the
      const n = text.split(cap.text).length - 1;
      assert(
        n <= cap.atMost,
        `${c.file}: "${cap.text}" appears ${n}× in the extracted text, want ≤${cap.atMost} — a merged table cell is being emitted once per column it spans`
      );
    }
    if (c.expectConfidence) {
      assert(
        conf.score === c.expectConfidence,
        `${c.file}: confidence ${conf.score}, want ${c.expectConfidence} (${conf.reasons.join("; ") || "no reasons"})`
      );
    }
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
    if (c.namedEmployers) {
      // E122 — count roles that actually NAME an employer. Eddie's résumé used to
      const named = p.experiences.filter(
        (e) => e.employer && e.employer !== "(Employer not detected)"
      ).length;
      assert(
        named >= c.namedEmployers,
        `${c.file}: only ${named} roles name an employer (want ${c.namedEmployers})`
      );
    }

    console.log(
      `ok    ${c.file.padEnd(26)} ${String(text.length).padStart(6)} chars · ` +
        `exp ${String(p.experiences.length).padStart(2)} · edu ${String(p.education.length).padStart(2)} · ` +
        `skills ${String(p.skills.length).padStart(2)} · suggest ${String(suggested.length).padStart(2)} · ` +
        `gaps ${p.gaps.length} · conf ${conf.score}  — ${c.note}`
    );
  }

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped (not present)`);
  if (failures.length) {
    console.log("\nfailures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
  }

  // A ZERO-CASE RUN FAILS. THIS IS , THE NAMESAKE
  if (pass === 0 && fail === 0) {
    console.log(
      `\n⚠⚠⚠ NOT A GATE — 0 of ${skipped} cases ran. This suite asserted NOTHING.\n` +
        `    ${DIR} holds no fixtures on this machine, and they are gitignored on purpose\n` +
        `    (real CVs). Reported as "0/0/${skipped} skipped", never as green (E586).`
    );
    process.exitCode = 1;
    return;
  }

  process.exitCode = fail ? 1 : 0;
}

void run();
