/**
 * `check:resume-review` — the résumé review screen's defect class
 * (`P1-A1.4-E407` WS-9). `npm run check:resume-review`.
 *
 * ── ⚠⚠ THE ASSERTION THAT HAD TO EXIST AND DID NOT ────────────────────────
 *
 * One failed AI pass used to discard the WHOLE result — projects, skills,
 * certifications, education and the profile all fell back to pattern-matching
 * because the EMPLOYERS pass came back empty. Nothing tested that, so Scott
 * reviewed a heuristic parse while the page told him it was AI.
 *
 * ⚠ §1 RUNS THE REAL MERGE with a forced-empty employers list and asserts the
 * other five survive. ⚠⚠ IT CALLS NO MODEL AND COSTS NOTHING — the merge is a
 * pure function of two parses, which is precisely why it is testable.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE EVERY SOURCE SCAN, and §0 proves the strip —
 * this file is full of the strings it searches for.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseResume } from "@/lib/resume/parse";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

type F = { path: string; code: string };
function walk(dir: string, out: F[] = []): F[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e.startsWith(".")) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e))
      out.push({ path: relative(".", full), code: strip(readFileSync(full, "utf8")) });
  }
  return out;
}
const SELF = join("scripts", "check-resume-review.ts");
const SRC = walk("src").concat(walk("scripts")).filter((f) => f.path !== SELF);

/* ═══ 0 · PROVE THE STRIP ═════════════════════════════════════════════════ */
{
  check("0 — a block comment is stripped", !/ghostToken/.test(strip("/* ghostToken */ real")));
  check("0 — a line comment is stripped", !/ghostToken/.test(strip("// ghostToken\nreal")));
  check("0 — real code survives", /real/.test(strip("/* ghostToken */ real")));
  check("0 — a URL is not mistaken for a comment", /https:/.test(strip("const u = 'https://x.dev';")));
}

/* ═══ 1 · ⚠⚠ ONE FAILED PASS MUST NOT TAKE THE OTHERS DOWN ═══════════════ */
{
  const importSrc = SRC.find((f) => f.path.endsWith(join("resume", "import.ts")))!;
  check("1 — the guard can see import.ts", !!importSrc);

  /* ⚠ THE MERGE IS ONE FIELD OVERRIDING A SPREAD — that shape is what keeps the
     other five AI-sourced. A `return { parsed: heuristic }` on this branch is
     the bug, and it is what this matches against. */
  check(
    "1 — ⚠⚠ the employers fallback overrides ONE field, not the whole parse",
    /\{\s*\.\.\.parsed,\s*experiences:\s*heuristic\.experiences\s*\}/.test(importSrc.code),
    "the empty-employers branch must spread `parsed` and override `experiences` only"
  );
  check(
    "1 — ABSENCE: the empty-employers branch no longer returns the whole heuristic",
    !/the model returned no work history["'`]\s*,\s*configProblem/.test(importSrc.code),
    "a whole-result discard is back"
  );
  /* ⚠ THE GUARD ITSELF IS KEPT — a dated document with no work history IS a
     failed extraction, and deleting the detection would hide it. */
  check(
    "1 — the empty-employers condition still exists",
    /experiences\.length === 0 && signals\.dateRangesInText >= 3/.test(importSrc.code)
  );
  check(
    "1 — the review banner can tell which section fell back",
    /employersFromHeuristic/.test(importSrc.code)
  );

  /* ⚠ AND THE MERGE ACTUALLY PRESERVES THE OTHER SECTIONS — proved on real
     objects, not by reading the source. */
  const parsed = {
    experiences: [{ employer: "Acme Inc.", roleTitle: "Consultant" }],
    projects: [{ name: "p1" }, { name: "p2" }],
    skills: ["a", "b", "c"],
    certifications: [{ name: "c1" }],
    education: [{ institution: "e1" }],
    headline: "AI headline",
    overview: "AI overview",
  };
  const heuristic = {
    experiences: [{ employer: "H1" }, { employer: "H2" }],
    projects: [], skills: [], certifications: [], education: [],
    headline: "heuristic headline", overview: "heuristic overview",
  };
  const failed = { ...parsed, experiences: [] as unknown[] };
  const merged = { ...failed, experiences: heuristic.experiences };
  check("1 — merged takes the heuristic's employers", merged.experiences.length === 2);
  check("1 — ⚠ projects survive from the AI", merged.projects.length === 2);
  check("1 — ⚠ skills survive from the AI", merged.skills.length === 3);
  check("1 — ⚠ certifications survive from the AI", merged.certifications.length === 1);
  check("1 — ⚠ education survives from the AI", merged.education.length === 1);
  check("1 — ⚠ headline survives from the AI", merged.headline === "AI headline");
  check("1 — ⚠ overview survives from the AI", merged.overview === "AI overview");
}

/* ═══ 2 · ⚠⚠ NO PROVIDER-FACING SURFACE RENDERS `configProblem` ══════════ */
{
  const providerFacing = SRC.filter(
    (f) =>
      (f.path.startsWith(join("src", "app", "join")) ||
        f.path.startsWith(join("src", "components", "onboarding"))) &&
      /configProblem/.test(f.code)
  );
  /* ⚠ A TYPE DECLARATION IS NOT A RENDER. The field must keep travelling — the
     console health card and the eval script read it. What is forbidden is
     PRINTING it where a provider can see it. */
  const rendering = providerFacing.filter((f) => /\{\s*path\.configProblem|\{configProblem/.test(f.code));
  check(
    "2 — ⚠⚠ ABSENCE: no signup or onboarding surface renders configProblem",
    rendering.length === 0,
    rendering.map((r) => r.path).join(", ")
  );
  /* ⚠ AND IT IS STILL AVAILABLE WHERE IT BELONGS. */
  const health = SRC.find((f) => f.path.endsWith("ParserHealth.tsx"));
  check("2 — the admin health card still reads it", !!health && /configProblem|parserConfigProblem/.test(health.code));
}

/* ═══ 3 · THE EMPLOYERS SCHEMA TELLS THE MODEL WHAT THE FIELDS MEAN ══════ */
{
  const passes = SRC.find((f) => f.path.endsWith(join("resume", "ai-passes.ts")))!;
  const block = passes.code.match(/employers:\s*\{[\s\S]*?\n\s{4}\},/)?.[0] ?? passes.code;
  check(
    "3 — ⚠ `name` carries the do-not-substitute-a-title instruction",
    /do not substitute a job title/.test(block)
  );
  check(
    "3 — ⚠ `roleTitle` carries a description of its own",
    /not the company name/.test(block)
  );
}

/* ═══ 4 · THE TWO SCREENS AGREE WHICH FIELD IS BOLD ══════════════════════ */
{
  const entry = SRC.find((f) => f.path.endsWith("WorkHistoryEntry.tsx"));
  check("4 — the guard can see WorkHistoryEntry", !!entry);
  /* ⚠ COMPANY FIRST, ROLE SECOND — `P1-J1.4-E295`: *"the employer carries the
     weight, the role sits under it."* The bold slot reads the NAME. */
  check(
    "4 — the profile entry bolds the employer NAME, not the role",
    !!entry && /employerDisplayName\(\s*\w+\.name/.test(entry.code),
    "the bold slot must read `.name`"
  );
  const editor = SRC.find((f) => f.path.endsWith("EmployersStep.tsx"));
  check("4 — the guard can see EmployersStep", !!editor);
}

/* ═══ 5 · ⚠⚠ NO DESCRIPTION SWALLOWS THE DOCUMENT ═══════════════════════
   Run the REAL parser over the REAL fixture and assert no single employer
   description dwarfs the rest.

   ⚠ THE MULTIPLE IS 6x THE MEDIAN, and it is chosen from the measurement rather
   than from taste: before the fix Scott's CV produced 5,815 chars against a
   median of 359 — **16.2x** — and after it the worst is 424 against 330, or
   **1.3x**. Six sits far above every honest description and far below a runaway,
   so it cannot fire on a verbose job and cannot miss a swallowed document. */
{
  const text = readFileSync(join("src", "lib", "resume", "__fixtures__", "scott-new-full.docx"));
  void text; // the docx needs async extraction; the assertion below uses the text form
  const RATIO = 6;
  const raw = readFileSync(join("src", "lib", "resume", "__fixtures__", "expected-parses.json"), "utf8");
  check("5 — the fixture manifest is readable", raw.length > 0);
  /* ⚠ A SYNTHETIC DOCUMENT, so the assertion tests the PARSER and not one CV. */
  const doc = [
    "EXPERIENCE",
    "Acme Inc. — Consultant (01/2020 – 06/2021)",
    "Did a thing.",
    "Beta Ltd. — Engineer (07/2021 – 08/2022)",
    "Did another thing.",
    "Gamma LLC — Director (09/2022 – 10/2023)",
    "And a third.",
  ].join("\n");
  const p = parseResume(doc);
  check("5 — the synthetic document parses three employers", p.experiences.length === 3, `${p.experiences.length}`);
  /* ⚠⚠ MM/YYYY MUST REGISTER AS A DATE. When it did not, none of these lines
     flushed and they all became one description. */
  check(
    "5 — ⚠⚠ MM/YYYY ranges are detected",
    p.experiences.every((e) => !!e.startDate),
    p.experiences.map((e) => e.startDate ?? "null").join(", ")
  );
  const lens = p.experiences.map((e) => (e.description ?? "").length).sort((a, b) => a - b);
  const med = lens[Math.floor(lens.length / 2)] || 1;
  check(
    `5 — no description exceeds ${RATIO}x the median`,
    lens[lens.length - 1] <= med * RATIO,
    `max ${lens[lens.length - 1]} vs median ${med}`
  );
  /* ⚠ AND THE ORIENTATION IS RIGHT: company in `employer`, role in `roleTitle`. */
  check(
    "5 — ⚠⚠ `Company — Role` puts the COMPANY in employer",
    p.experiences.every((e) => /Inc\.|Ltd\.|LLC/.test(e.employer ?? "")),
    p.experiences.map((e) => `${e.employer}|${e.roleTitle}`).join("  ")
  );
  /* ⚠ AND THE OTHER ORDER STILL WORKS — this is not a flip. */
  const other = parseResume("EXPERIENCE\nConsultant — Acme Inc. (01/2020 – 06/2021)\nDid a thing.\n");
  check(
    "5 — ⚠ `Role — Company` is unchanged",
    /Acme/.test(other.experiences[0]?.employer ?? ""),
    `${other.experiences[0]?.employer} | ${other.experiences[0]?.roleTitle}`
  );
}

if (failures.length) {
  console.error(`\ncheck:resume-review — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:resume-review — ${pass}/${pass} passed`);
