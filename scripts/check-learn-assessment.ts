/**
 * `check:learn-assessment` — the four ways a generated test stops being worth
 * passing (brief_learn_assessments_generate WS6).
 *
 *   1  EVERY STORED QUESTION NAMES A LESSON IN ITS OWN PATH. A question that
 *      cannot is one written from the vendor documentation or from a title.
 *   2  THE TEST ROUTE REFUSES A DRAFT. A set nobody has read must not award a
 *      certificate.
 *   3  `buildAssessmentSource` EXCLUDES ALL THREE KNOWN-BAD ROW CLASSES.
 *   4  NO COMPONENT PRINTS `70%` OR `3 attempts` AS A LITERAL — they are
 *      per-path columns, already the rule in `check:learn`.
 *
 * ⚠ `pitfalls.md` 2026-08-19: *"Without breaking it deliberately I'd have
 * shipped a green check that asserted nothing."* Every assertion below was broken
 * on purpose before it was trusted, and two of them were wrong when first written.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN. This file names every forbidden
 * shape, and so do the files it guards.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  QUESTION_SCHEMA,
  keepQuestionsInPath,
  sectionIsExcluded,
} from "@/lib/learn-assessment";
import { extractDocText, validateTopicPage } from "@/lib/learn-doc-source";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const SELF = join("scripts", "check-learn-assessment.ts");
const files = [...walk("src"), ...walk("scripts"), ...walk("prisma").filter((f) => /\.ts$/.test(f))].filter(
  (f) => f !== SELF
);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const LIB = join("src", "lib", "learn-assessment.ts");
const ROUTE = join("src", "app", "api", "learn", "test", "[pathId]", "route.ts");
const PAGE = join("src", "app", "learn", "[slug]", "test", "page.tsx");
const BATCH = join("prisma", "generate-learn-assessments.ts");

for (const f of [LIB, ROUTE, PAGE, BATCH]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const lib = bodies.get(LIB) ?? "";
const route = bodies.get(ROUTE) ?? "";
const page = bodies.get(PAGE) ?? "";
const batch = bodies.get(BATCH) ?? "";

// ---------------------------------------------------------------------------
// GUARD 1 — every question names a lesson in its own path
// ---------------------------------------------------------------------------

check("GUARD 1 — lessonId is REQUIRED by the storage schema", (() => {
  const r = QUESTION_SCHEMA.safeParse({
    id: "q1", question: "Q?", options: ["a", "b", "c"], correctIndex: 0,
  });
  return !r.success;
})());
check("GUARD 1 — a question WITH a lessonId validates", (() => {
  const r = QUESTION_SCHEMA.safeParse({
    id: "q1", question: "Q?", options: ["a", "b", "c"], correctIndex: 0, lessonId: "L1",
  });
  return r.success && r.data.sourceKind === "LESSON";
})());
/*
  ⚠ THE INJECTED ORPHAN — the brief asks for exactly this. `keepQuestionsInPath`
  is extracted from `generateAssessment` so the rule can be exercised without a
  live model call; a rule that only runs inside an API request is a rule nobody
  can test.
*/
check("GUARD 1 — an injected out-of-path lessonId is REJECTED", (() => {
  const known = new Set(["in-path-1", "in-path-2"]);
  const { kept, orphaned } = keepQuestionsInPath(
    [
      { lessonId: "in-path-1", id: "q1" },
      { lessonId: "SOME-OTHER-PATHS-LESSON", id: "q2" },
      { lessonId: "in-path-2", id: "q3" },
    ],
    known
  );
  return kept.length === 2 && orphaned.length === 1 && orphaned[0].id === "q2";
})());
check("GUARD 1 — generateAssessment routes through that filter", /keepQuestionsInPath\(answerable, known\)/.test(lib));
check(
  "GUARD 1 — and it rejects rather than repairing",
  !/lessonId\s*=\s*|lessonId:\s*source\.index\[0\]/.test(lib),
  "no code path may assign a lessonId the model did not supply"
);
check(
  "GUARD 1 — the prompt demands the id and forbids unattributable questions",
  /REQUIRED: give every question the exact lessonId/.test(lib) &&
    /do not write it/.test(lib)
);
check(
  "GUARD 1 — the docs are context for accuracy, not extra syllabus",
  /OUT OF SCOPE for this test/.test(lib)
);
/*
  ⚠ SCOPED TO PUBLISHED, DELIBERATELY. A DRAFT is by definition not trusted yet —
  and the ONE pre-existing row predates `lessonId` entirely, so a rule over all
  rows would fail on a set that cannot award anything. What must hold is that
  nothing UNVERIFIABLE can ever be published; that is asserted below and by the
  route.
*/
check(
  "GUARD 1 — spread is asserted, not merely requested of the model",
  /concentration\s*>\s*0\.4/.test(lib) && /overCap/.test(lib)
);

// ---------------------------------------------------------------------------
// GUARD 2 — the test route refuses a DRAFT
// ---------------------------------------------------------------------------

check(
  "GUARD 2 — there is one publish gate and it refuses non-PUBLISHED",
  /status !== "PUBLISHED"[\s\S]{0,240}AssessmentNotReady/.test(lib)
);
check("GUARD 2 — grading goes through it", /getPublishedAssessment\(learningPathId\)/.test(lib));
check("GUARD 2 — the GET route goes through it", /getPublishedAssessment\(pathId\)/.test(route));
check(
  "GUARD 2 — the route answers 409 rather than serving questions",
  /AssessmentNotReady[\s\S]{0,160}status: 409/.test(route)
);
check(
  "GUARD 2 — both verbs handle it",
  (route.match(/instanceof AssessmentNotReady/g) ?? []).length === 2,
  `${(route.match(/instanceof AssessmentNotReady/g) ?? []).length} handler(s)`
);
/*
  ⚠ AND THE LEARNER ROUTE MUST NOT GENERATE. It used to, which under a review
  gate means spending a model call to produce something the same request refuses.
*/
check(
  "GUARD 2 — the learner route never generates",
  !/getOrCreateAssessment/.test(route)
);
check(
  "GUARD 2 — the page has a not-ready branch and does not render the runner in it",
  /!state\.ready/.test(page)
);
/*
  ⚠ SCOPED TO AN ASSESSMENT WRITE. The first version banned the string
  `status: "PUBLISHED"` anywhere in the batch script and failed on
  `where: { status: "PUBLISHED" }` — the filter that selects PUBLISHED LEARNING
  PATHS, an entirely different model. A guard that cannot tell a query from a
  write is a guard that gets relaxed.
*/
const publishesOnWrite = (src: string) =>
  /learnAssessment\.(create|update|upsert)\(([\s\S]{0,900}?)status:\s*"PUBLISHED"/.test(src);
check(
  "GUARD 2 — nothing that WRITES questions also publishes them",
  !publishesOnWrite(lib) && !publishesOnWrite(batch)
);
check(
  "GUARD 2 — the batch refuses to overwrite a PUBLISHED set",
  /status === "PUBLISHED"[\s\S]{0,200}continue/.test(batch)
);
check(
  "GUARD 2 — replacing a DRAFT voids any prior review",
  /status: "DRAFT",[\s\S]{0,80}reviewed_by: null/.test(batch)
);

// ---------------------------------------------------------------------------
// GUARD 3 — the three WS3 filters
// ---------------------------------------------------------------------------

check("GUARD 3 — 'Ideas for Future Videos' is excluded", sectionIsExcluded("6. Ideas for Future Videos"));
check("GUARD 3 — …with or without the ordinal", sectionIsExcluded("Ideas for Future Videos"));
check("GUARD 3 — 'Learning Path Overview' is excluded", sectionIsExcluded("Learning Path Overview"));
/* ⚠ AND NOTHING ELSE IS. An over-wide filter silently empties the syllabus. */
for (const keep of [
  "1. Course Overview",
  "2. Create New",
  "3. Find Existing",
  "4. Change Existing",
  "1. Learn about",
  "2. Functional Area Overview",
  "5. Related Careers",
]) {
  check(`GUARD 3 — "${keep}" is KEPT`, !sectionIsExcluded(keep));
}
check(
  "GUARD 3 — an empty course title drops its lessons from the source",
  /if \(!c\.title\.trim\(\)\)[\s\S]{0,200}continue;/.test(lib)
);
check(
  "GUARD 3 — the removals are counted per class, for the report",
  /ideasForFuture/.test(lib) && /pathOverview/.test(lib) && /emptyCourse/.test(lib)
);
check(
  "GUARD 3 — a path left too thin is refused rather than given a thin test",
  /MIN_LESSONS/.test(batch) && /TOO THIN/.test(batch)
);
/* ⚠ THE CURRICULUM IS NEVER THE PART THAT GETS TRUNCATED — the lessonIds live in it. */
check(
  "GUARD 3 — documentation is appended only while there is room",
  /text\.length \+ block\.length > MAX_SOURCE_CHARS/.test(lib)
);

// ---------------------------------------------------------------------------
// GUARD 4 — no component prints the pass mark or attempt limit as a literal
// ---------------------------------------------------------------------------

/*
  Scrub bracketed Tailwind values, rgba() and unit-suffixed numbers first — the
  same lesson `check:learn` recorded, where `rgba(23,30,62,…)` read as the catalog
  count. `70` and `3` are far more common than 23/54/522, so the scrub matters more.
*/
const scrub = (src: string) =>
  src
    .replace(/rgba?\([^)]*\)/g, " ")
    .replace(/\[[^\]\n]*\]/g, " ")
    /*
      ⚠ TAILWIND OPACITY. `text-white/70` is a colour, and it produced a false
      positive on the real tree the first time this ran — the `/` is not a word
      character, so a naive boundary check reads `/70` as the number 70.
    */
    .replace(/\/\d+(?=\D|$)/g, " ")
    .replace(/\b\d+(?:\.\d+)?(px|%|deg|rem|em|ms|s|fr|vh|vw)\b/g, " ");

/*
  ⚠ THE CONTEXT IS THE FILE, NOT THE LINE — and the first version got this wrong
  in the one way that mattered.

  It required the SAME LINE to mention pass/threshold/attempt. Breaking the guard
  by replacing `{path.test.passThreshold}%` with a literal `70%` left a line
  reading only `70%`, which mentions none of those words, so the guard passed the
  exact regression it exists to catch. Scoping the context to the FILE and the
  literal to the LINE is what makes the break reproduce.
*/
const literalOffences: string[] = [];
for (const [file, body] of bodies) {
  /*
    ⚠ SCOPED TO THE LEARN COMPONENTS, and that is a real narrowing.

    A whole-`components/` sweep flagged `marketing-home/OptimizationDashboardShot`
    for `{ h: 70, on: true, n: 3 }` — a chart bar height with no relationship to a
    pass mark. The learn test is rendered only by learn components, so widening
    the scope buys nothing and costs the guard its credibility the first time
    somebody has to explain a failure. If a pass mark is ever printed from
    outside this tree, this assertion will not see it.
  */
  if (!file.startsWith(join("src", "components", "learn"))) continue;
  /* Is this file about the test at all? If not, its numbers are its own business. */
  if (!/pass[A-Z_]?|threshold|attempt/i.test(body)) continue;
  const scrubbed = scrub(body);
  scrubbed.split("\n").forEach((line, i) => {
    if (/(^|[^\w.$-])70(?![\w.])/.test(line) || /\b3\s+attempts\b/i.test(line)) {
      literalOffences.push(`${file}:${i + 1} ${line.trim().slice(0, 60)}`);
    }
  });
}
check(
  "GUARD 4 — no component hardcodes the pass mark or the attempt limit",
  literalOffences.length === 0,
  literalOffences.join(", ")
);
check(
  "GUARD 4 — the path page reads `ready`, not merely `exists`",
  /path\.test\.ready \?/.test(bodies.get(join("src", "components", "learn", "app", "AppPath.tsx")) ?? "")
);

// ---------------------------------------------------------------------------
// The documentation fetcher's refusal
// ---------------------------------------------------------------------------

/*
  ⚠ THE ROT IS A REDIRECT, NOT A 404. Measured: the 25a topic answers 200 after
  redirecting to a "Get Started" landing page with 1,389 characters of real text.
  Only the pathname comparison notices.
*/
check(
  "DOCS — a redirect away from the topic is refused",
  (() => {
    const v = validateTopicPage({
      requestedUrl: "https://docs.oracle.com/en/cloud/saas/procurement/25a/oaprc/qualification-areas.html",
      finalUrl: "https://docs.oracle.com/en/cloud/saas/procurement/26c/index.html",
      title: "Oracle Procurement 26C - Get Started",
      text: "x".repeat(20_000),
    });
    return !v.ok && /Redirected away/.test(v.reason);
  })()
);
check(
  "DOCS — a landing-page TITLE is refused even at the right URL",
  (() => {
    const u = "https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/x.html";
    const v = validateTopicPage({ requestedUrl: u, finalUrl: u, title: "Oracle Procurement 26C - Get Started", text: "x".repeat(20_000) });
    return !v.ok;
  })()
);
check(
  "DOCS — a stub is refused",
  (() => {
    const u = "https://docs.oracle.com/a/b.html";
    const v = validateTopicPage({ requestedUrl: u, finalUrl: u, title: "Qualification Areas", text: "too short" });
    return !v.ok;
  })()
);
check(
  "DOCS — the real topic is accepted",
  (() => {
    const u = "https://docs.oracle.com/en/cloud/saas/procurement/26c/oaprc/qualification-areas.html";
    const v = validateTopicPage({ requestedUrl: u, finalUrl: u, title: "Qualification Areas", text: "x".repeat(20_000) });
    return v.ok;
  })()
);
check(
  "DOCS — script and style contents never reach the source text",
  (() => {
    const { title, text } = extractDocText(
      "<html><head><title>Qualification Areas</title></head><body><script>var poison=1;</script><style>.a{color:red}</style><p>Areas are containers.</p></body></html>"
    );
    return title === "Qualification Areas" && text === "Areas are containers." ;
  })()
);
check(
  "DOCS — vendor text is labelled as vendor text in the prompt",
  /REFERENCE DOCUMENTATION \(vendor, not instructor\)/.test(
    readFileSync(join("src", "lib", "learn-doc-source.ts"), "utf8")
  ) && /END REFERENCE DOCUMENTATION/.test(lib)
);
/*
  ⚠ THE COUNSEL GATE, AS AN ASSERTION. There must be no way to bulk-populate the
  documentation columns until the licensing question is answered.
*/
check(
  "DOCS — the fetcher takes one course at a time, with no --all",
  !/--all/.test(bodies.get(join("prisma", "fetch-course-docs.ts")) ?? "")
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:learn-assessment — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:learn-assessment — ${pass}/${pass} passed`);
