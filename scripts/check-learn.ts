/**
 * `check:learn` — THE THREE THINGS THIS BUILD REGRESSES INTO
 * (brief_learn_app_shell WS4).
 *
 * ── WHY A SOURCE SCANNER AND NOT ONLY UNIT TESTS ─────────────────────────────
 *
 * Two of the three failures this guards against are not wrong LOGIC, they are a
 * component quietly doing arithmetic it shouldn't, or printing a number that is
 * true today. Nothing you can assert about a function's return value catches
 * `{lessons.reduce((n, l) => n + parse(l.run_time), 0)}` appearing in a new file
 * next month. So: half of this file reads source text, and half of it exercises
 * the pure derivations.
 *
 *   1  NO SUMMED DURATIONS   — `run_time` is spreadsheet display copy, not a
 *                              duration. Measured on the live DB: 290 of 522
 *                              rows null, and the non-null ones include
 *                              "3:22:00" for a three-minute lesson, ":56",
 *                              "Intro", "NA", "Done", "Incomplete" and
 *                              "2 days, 1:04:00". There is no total.
 *   2  NO ORPHAN FACES       — a lesson that names nobody must INHERIT, and one
 *                              whose expert is a placeholder must be OMITTED.
 *                              Both rules live in `lib/learn-faces.ts` and this
 *                              fails the build if any file maps a lesson to a
 *                              single instructor without going through it.
 *   3  NO FABRICATED TOTALS  — 23 paths / 54 courses / 522 lessons are QUERY
 *                              RESULTS. A literal in a component is a number
 *                              that stops being true at the next XLS import.
 *
 * ── ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN ──────────────────────────────────
 *
 * Learned from `check:catalog-value`, whose collected-field regex matched the
 * word `Scott:` inside a quoted comment and would have let a bogus value pass.
 * This file's own prose mentions all three forbidden numbers and the phrase
 * "reduce run_time"; a scanner that read comments would fail on its own
 * documentation, and the fix for that is always to weaken the scanner.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { sectionKind, normalizeSectionTitle } from "@/lib/learn-sections";
import { streakFrom, levelFor, headlineFor, spell } from "@/lib/learn-progress";
import { isPlaceholderInstructor, lessonFace } from "@/lib/learn-faces";
import { certificateClaims, leaderLabel } from "@/lib/learn-path-app";
import type { Instructor } from "@/lib/learn-instructor-format";

let pass = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// file collection
// ---------------------------------------------------------------------------

const ROOTS = ["src/components/learn", "src/lib"];
const SELF = "scripts/check-learn.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const learnFiles = ROOTS.flatMap((r) => walk(r)).filter(
  (f) => f !== SELF && (f.startsWith("src/components/learn") || /learn/i.test(f.split("/").pop()!))
);

check("harness sees the Learn surface", learnFiles.length >= 15, `${learnFiles.length} files`);

/**
 * Strip `//` and block comments. Not a parser — a `//` inside a string literal
 * would be over-stripped, which can only make this scanner MORE permissive, and
 * a scanner that errs permissive is a scanner nobody weakens under pressure.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const bodies = new Map(learnFiles.map((f) => [f, stripComments(readFileSync(f, "utf8"))]));

// ---------------------------------------------------------------------------
// GUARD 1 — no summed durations
// ---------------------------------------------------------------------------

/*
  The shapes that would turn display copy into a number. `.reduce(` and `+=` are
  the aggregate forms; `parseInt`/`parseFloat`/`Number(`/`split(":")` are the
  parse forms; `* 60` and `* 3600` are what a hand-rolled H:MM:SS converter looks
  like once someone has already parsed it.
*/
const ARITHMETIC = [
  /\.reduce\s*\(/,
  /\+=/,
  /parseInt\s*\(/,
  /parseFloat\s*\(/,
  /Number\s*\(/,
  /\.split\s*\(\s*["']:["']\s*\)/,
  /\*\s*(60|3600)\b/,
  /totalSeconds|totalMinutes|totalHours|sumRunTime|hoursInvested/i,
];

const durationOffences: string[] = [];
for (const [file, body] of bodies) {
  const lines = body.split("\n");
  lines.forEach((line, i) => {
    if (!/\brun_?[Tt]ime\b/.test(line)) return;
    for (const re of ARITHMETIC) {
      if (re.test(line)) {
        durationOffences.push(`${file}:${i + 1} ${line.trim().slice(0, 90)}`);
        break;
      }
    }
  });
}
check(
  "GUARD 1 — no run_time is summed, parsed or reduced",
  durationOffences.length === 0,
  durationOffences.join(" | ")
);

/*
  The same rule stated positively, so deleting the display of run_time to satisfy
  the guard is also caught: the value has to still be RENDERED somewhere, raw.
*/
check(
  "GUARD 1b — run_time is still rendered verbatim somewhere",
  [...bodies.values()].some((b) => /\{\s*l\.runTime\s*\}|\$\{[^}]*\.runTime\}|card\.lesson\.runTime/.test(b))
);

// ---------------------------------------------------------------------------
// GUARD 2 — no orphan faces
// ---------------------------------------------------------------------------

/*
  Any file that resolves a LESSON to a SINGLE instructor must import
  `lessonFace`. Detected as: the file reads a lesson's expert column AND assigns
  a singular `instructor`. The plural `instructors` (a path's or a course's
  derived list) is a different concern and belongs to `resolveInstructors`.
*/
const FACE_EXEMPT = new Set([
  join("src", "lib", "learn-faces.ts"),
  join("src", "lib", "learn-instructors.ts"),
  join("src", "lib", "learn-instructor-format.ts"),
]);

const faceOffences: string[] = [];
for (const [file, body] of bodies) {
  if (FACE_EXEMPT.has(file)) continue;
  const readsExpert = /\bexpert_person_id\b|\bexpertPersonId\b/.test(body);
  const singularInstructor = /\binstructor\s*[:=][^=]/.test(body);
  if (readsExpert && singularInstructor && !/\blessonFace\b/.test(body)) {
    faceOffences.push(file);
  }
}
check(
  "GUARD 2 — every lesson→face mapping goes through lessonFace",
  faceOffences.length === 0,
  faceOffences.join(", ")
);

/* And the two behaviours actually exist inside it, rather than being claimed. */
const facesSrc = bodies.get(join("src", "lib", "learn-faces.ts")) ?? "";
check("GUARD 2b — learn-faces omits placeholder experts", /isPlaceholderInstructor/.test(facesSrc));
check(
  "GUARD 2c — learn-faces inherits when the lesson names nobody",
  /courseInstructors\[0\][\s\S]{0,80}pathInstructors\[0\]/.test(facesSrc)
);

/* No Learn COMPONENT may read the column at all — the mapping is the lib's job. */
const componentLeaks = [...bodies.entries()]
  .filter(([f]) => f.startsWith(join("src", "components", "learn")))
  .filter(([, b]) => /\bexpert_person_id\b|\bexpertPersonId\b/.test(b))
  .map(([f]) => f);
check(
  "GUARD 2d — no Learn component reads a lesson's expert column",
  componentLeaks.length === 0,
  componentLeaks.join(", ")
);

// ---------------------------------------------------------------------------
// GUARD 3 — no fabricated totals
// ---------------------------------------------------------------------------

/*
  The three catalog counts, as of 2026-08-19. Deliberately written as a computed
  list rather than three digits so this file does not trip its own guard when the
  scanner is pointed at `scripts/` by a future refactor.
*/
const FORBIDDEN = [20 + 3, 50 + 4, 500 + 22];

/**
 * Scrub everything that is legitimately a number before looking for the three.
 *
 * `rgba(23,30,62,…)` is the ink colour and appears in every card shadow on this
 * surface; `text-[23px]`, `min-[520px]` and `h-[54px]` are Tailwind arbitrary
 * values. All of them live inside brackets or a colour function, so stripping
 * those two shapes leaves the case that matters: a bare literal in markup, copy
 * or a variable.
 */
function scrubNumbers(src: string): string {
  return src
    .replace(/rgba?\([^)]*\)/g, " ")
    .replace(/\[[^\]\n]*\]/g, " ")
    .replace(/\b\d+(?:\.\d+)?(px|%|deg|rem|em|ms|s|fr|vh|vw)\b/g, " ");
}

const totalOffences: string[] = [];
for (const [file, body] of bodies) {
  if (!file.startsWith(join("src", "components", "learn"))) continue;
  const scrubbed = scrubNumbers(body);
  scrubbed.split("\n").forEach((line, i) => {
    for (const n of FORBIDDEN) {
      const re = new RegExp(`(^|[^\\w.$-])${n}(?![\\w.])`);
      if (re.test(line)) {
        totalOffences.push(`${file}:${i + 1} literal ${n}`);
        break;
      }
    }
  });
}
check(
  "GUARD 3 — no catalog total appears as a literal in a component",
  totalOffences.length === 0,
  totalOffences.join(" | ")
);

/*
  ── GUARD 3c — THE ONE PLACE A CATALOG TOTAL IS ALLOWED TO BE A LITERAL ───────

  ⚠ GUARD 3 ABOVE IS UNCHANGED, UNWIDENED AND UNWEAKENED. This is additive, and it
  exists because `P1-J0-E291` put three catalog totals in `/learn`'s signed-out
  hero and three shipped decisions met on them:

    · the brief said HARDCODE (a query in a hero buys nothing);
    · GUARD 3 forbids a literal under `src/components/learn/` — it FIRED on the
      first cut of that work, correctly;
    · `E223` (`app/learn/page.tsx`) says a signed-out visitor NEVER sees a catalog
      query, so GUARD 3b's "derive it from a query" is not available on this
      surface.

  GUARD 3's scope is the resolution: it watches components, where a stale total
  masquerades as live UI. The numbers moved to ONE named module instead, and this
  guard is what stops that module becoming a place where undated digits accumulate
  — it must carry the date it was read, and the component must import rather than
  inline.

  ⚠ IF SOMEBODY MOVES THE DIGITS BACK INTO THE COMPONENT, GUARD 3 CATCHES IT. If
  somebody drops the provenance from the module, this one does. Neither guard is
  sufficient alone, which is why there are two.
*/
const countsPath = join("src", "lib", "learn-catalog-counts.ts");
const counts = readFileSync(countsPath, "utf8");
check(
  "GUARD 3c — the catalog counts module records the date it was measured",
  /CATALOG_COUNTS_MEASURED_ON\s*=\s*"\d{4}-\d{2}-\d{2}"/.test(counts),
  "an undated catalog total cannot be told from a stale one"
);
check(
  "GUARD 3c — it names the queries the numbers came from, not a seed file",
  /prisma\.learningPath\.count\(\)/.test(counts) &&
    /prisma\.course\.count\(\)/.test(counts) &&
    /prisma\.lesson\.count\(\)/.test(counts),
  "chat_kickoff.md: a fact about content may only be stated from a live DB read"
);
check(
  "GUARD 3c — /learn's hero reads the counts from that module rather than inlining them",
  /import\s*\{\s*CATALOG_COUNTS\s*\}\s*from\s*"@\/lib\/learn-catalog-counts"/.test(
    readFileSync(join("src", "components", "learn", "LearnPublic.tsx"), "utf8")
  ),
  "if the hero stops importing them, the digits came back into the component"
);

/* Stated positively: the totals reach the UI from a query result. */
const dash = readFileSync(join("src", "lib", "learn-dashboard.ts"), "utf8");
check(
  "GUARD 3b — the dashboard derives its totals from the tree it read",
  /totals:\s*\{\s*paths:\s*rows\.length,\s*courses:\s*totalCourses,\s*lessons:\s*totalLessons\s*\}/.test(
    dash
  )
);

/*
  ── TWO REGRESSIONS THAT WERE ONLY VISIBLE IN A BROWSER ──────────────────────

  Both were found by signing in as fixtures and reading the DOM, and neither is
  expressible as a claim about `headlineFor` or `getMyLearning` in isolation —
  they are about WHICH ROWS the caller hands over. So they are pinned as source
  assertions, which is the honest shape for "the filter must still be there".
*/
check(
  "REGRESSION — a CERTIFIED path is excluded from the nearest-certificate search",
  /enrolled:\s*rows\s*\n?\s*\.filter\(\(r\) => r\.enrolled && !r\.certified\)/.test(dash),
  "without it the headline tells someone holding the certificate to sit the test"
);
check(
  "REGRESSION — the continue card falls through a FINISHED last-touched path",
  /hasUnwatched\(lastRow\.p\)[\s\S]{0,120}paths\.find\(\(p\) => enrolledIds\.has\(p\.id\) && hasUnwatched\(p\)\)/.test(
    dash
  ),
  "without it a learner with two half-done paths is told there is nowhere to resume"
);

// ---------------------------------------------------------------------------
// The pure derivations
// ---------------------------------------------------------------------------

// SectionIcon — every spelling measured in the live DB, plus the misses.
check("sectionKind: '1. Course Overview'", sectionKind("1. Course Overview") === "overview");
check("sectionKind: '0. Overview'", sectionKind("0. Overview") === "overview");
check("sectionKind: 'Learning Path Overview'", sectionKind("Learning Path Overview") === "overview");
check("sectionKind: '2. Create New'", sectionKind("2. Create New") === "create");
check("sectionKind: '2. Create new' (the other spelling)", sectionKind("2. Create new") === "create");
check("sectionKind: '3. Find Existing'", sectionKind("3. Find Existing") === "find");
check("sectionKind: '3. Find existing'", sectionKind("3. Find existing") === "find");
check("sectionKind: '4. Change Existing'", sectionKind("4. Change Existing") === "change");
check("sectionKind: '4. Change existing'", sectionKind("4. Change existing") === "change");
/*
  ⚠ THE MISSES ARE THE POINT. "1. Learn about" reads like an overview and must
  NOT be guessed into one — a lesson group labelled with the wrong verb is worse
  than one labelled with none.
*/
check("sectionKind: '1. Learn about' is NOT guessed", sectionKind("1. Learn about") === "other");
check("sectionKind: '6. Ideas for Future Videos'", sectionKind("6. Ideas for Future Videos") === "other");
check("sectionKind: '3. Applications'", sectionKind("3. Applications") === "other");
check("sectionKind: '5. Related Careers'", sectionKind("5. Related Careers") === "other");
check("normalizeSectionTitle strips the ordinal", normalizeSectionTitle("2. Create New") === "create new");

// Placeholder instructors
check("placeholder: TBD", isPlaceholderInstructor("TBD"));
check("placeholder: tbd lower", isPlaceholderInstructor("tbd"));
check("placeholder: T.B.D.", isPlaceholderInstructor("T.B.D."));
check("placeholder: empty", isPlaceholderInstructor(""));
check("placeholder: null", isPlaceholderInstructor(null));
check("NOT a placeholder: a real name", !isPlaceholderInstructor("Marelise Steenkamp"));
/* ⚠ A substring match here would erase real people. */
check("NOT a placeholder: 'Nan Abraham'", !isPlaceholderInstructor("Nan Abraham"));
check("NOT a placeholder: 'Tbadinski'", !isPlaceholderInstructor("Tbadinski"));

// lessonFace — the four cases from the brief's table
const scott: Instructor = { id: "p1", name: "Scott Walls", photoUrl: "/s.jpg", profileSlug: "abc", lessons: 338 };
const tbd: Instructor = { id: "p2", name: "TBD", photoUrl: null, profileSlug: null, lessons: 1 };
const linus: Instructor = { id: "p3", name: "Linus Erley", photoUrl: "/l.jpg", profileSlug: null, lessons: 70 };
const dir = new Map<string, Omit<Instructor, "lessons">>([
  ["p1", scott],
  ["p2", tbd],
  ["p3", linus],
]);

check(
  "face: lesson names its own expert → that expert, not inherited",
  (() => {
    const f = lessonFace({ expert_person_id: "p1" }, dir, [linus], []);
    return f.instructor?.id === "p1" && f.inherited === false;
  })()
);
check(
  "face: lesson names NOBODY → inherits the course's dominant instructor",
  (() => {
    const f = lessonFace({ expert_person_id: null }, dir, [linus], [scott]);
    return f.instructor?.id === "p3" && f.inherited === true;
  })()
);
check(
  "face: no lesson expert AND no course expert → the path's declared lead",
  (() => {
    const f = lessonFace({ expert_person_id: null }, dir, [], [scott]);
    return f.instructor?.id === "p1" && f.inherited === true;
  })()
);
check(
  "face: expert is literally TBD → face AND name omitted",
  lessonFace({ expert_person_id: "p2" }, dir, [linus], [scott]).instructor === null
);
check(
  "face: nobody anywhere → null, never an empty circle",
  lessonFace({ expert_person_id: null }, dir, [], []).instructor === null
);
check(
  "face: a named-but-unloadable expert does NOT silently inherit",
  lessonFace({ expert_person_id: "gone" }, dir, [linus], [scott]).instructor === null
);

// Streak — the timezone case the brief names
check("streak: no completions → 0/0", streakFrom([], "UTC").current === 0);
check(
  "streak: an 8pm Eastern lesson lands on ITS OWN day, not tomorrow",
  (() => {
    /* 2026-08-18 20:00 ET === 2026-08-19 00:00 UTC. Two lessons, two evenings,
       one unbroken streak — counting UTC dates would make it three days. */
    const evenings = ["2026-08-19T00:00:00Z", "2026-08-20T00:00:00Z"];
    const et = streakFrom(evenings, "America/New_York", new Date("2026-08-20T12:00:00Z"));
    const utc = streakFrom(evenings, "UTC", new Date("2026-08-20T12:00:00Z"));
    return et.current === 2 && et.best === 2 && utc.current === 2 && utc.best === 2;
  })()
);
check(
  "streak: yesterday still counts, two days' silence does not",
  (() => {
    const now = new Date("2026-08-19T12:00:00Z");
    const yesterday = streakFrom(["2026-08-18T12:00:00Z"], "UTC", now);
    const stale = streakFrom(["2026-08-16T12:00:00Z"], "UTC", now);
    return yesterday.current === 1 && stale.current === 0 && stale.best === 1;
  })()
);
check(
  "streak: best is the longest run, not the current one",
  (() => {
    const s = streakFrom(
      ["2026-08-01T12:00:00Z", "2026-08-02T12:00:00Z", "2026-08-03T12:00:00Z", "2026-08-19T12:00:00Z"],
      "UTC",
      new Date("2026-08-19T12:00:00Z")
    );
    return s.current === 1 && s.best === 3;
  })()
);
check(
  "streak: two completions on ONE day are one day",
  streakFrom(["2026-08-19T09:00:00Z", "2026-08-19T21:00:00Z"], "UTC", new Date("2026-08-19T22:00:00Z"))
    .current === 1
);

// Levels — a banding of lessons, with a real bottom and a real top
check("level: 0 lessons is the bottom band, empty ring", levelFor(0).level === 1 && levelFor(0).fraction === 0);
check("level: 0 lessons still names a next band", levelFor(0).nextName !== null);
check("level: the top band's ring is full, not empty", levelFor(10_000).fraction === 1);
check("level: the top band has no next", levelFor(10_000).nextName === null && levelFor(10_000).toNext === 0);
check("level: bands are monotonic", (() => {
  let prev = -1;
  for (const n of [0, 4, 5, 24, 25, 74, 75, 174, 175, 349, 350]) {
    const l = levelFor(n).level;
    if (l < prev) return false;
    prev = l;
  }
  return true;
})());
check("level: fraction stays inside 0..1", [0, 1, 30, 200, 349].every((n) => {
  const f = levelFor(n).fraction;
  return f >= 0 && f <= 1;
}));

// The computed headline — the empty account is the case that catches hardcoding
check(
  "headline: nothing enrolled → the empty form",
  headlineFor({ enrolled: [] }) === "Pick a path and start."
);
check(
  "headline: three left → the mocked line, spelled out",
  headlineFor({ enrolled: [{ title: "Advanced Procurement", remaining: 3, completed: 67 }] }) ===
    "Three lessons from your next certificate."
);
check(
  "headline: one left is singular",
  headlineFor({ enrolled: [{ title: "X", remaining: 1, completed: 9 }] }) ===
    "One lesson from your next certificate."
);
check(
  "headline: far off → names the path and the count",
  headlineFor({ enrolled: [{ title: "Basic Payables", remaining: 28, completed: 13 }] }) ===
    "You're 13 lessons into Basic Payables."
);
check(
  "headline: enrolled but nothing watched never says '0 lessons into'",
  !headlineFor({ enrolled: [{ title: "X", remaining: 41, completed: 0 }] }).includes("0 lesson")
);
check(
  "headline: everything watched never says 'Zero lessons from'",
  !headlineFor({ enrolled: [{ title: "X", remaining: 0, completed: 41 }] }).toLowerCase().includes("zero")
);
check("spell: 3 → Three, 14 → 14", spell(3) === "Three" && spell(14) === "14");

// Certificate claims — derived from real course titles, never hand-written
check(
  "claims: 'How to Use the Negotiations Application' → 'Use the Negotiations Application'",
  certificateClaims(["How to Use the Negotiations Application"])[0] === "Use the Negotiations Application"
);
check(
  "claims: an ordinal prefix is stripped",
  certificateClaims(["3. How to Use the Terms Library Application"])[0] ===
    "Use the Terms Library Application"
);
check("claims: duplicates collapse", certificateClaims(["How to Use X", "How to Use X"]).length === 1);
check("claims: nothing in, nothing out", certificateClaims([]).length === 0);

// Leaderboard labels — ⚠ never an email
check("leader label: first initial + surname", leaderLabel("Marelise", "Steenkamp") === "M. Steenkamp");
check("leader label: surname only", leaderLabel(null, "Tran") === "Tran");
check("leader label: no name is not an email", leaderLabel(null, null) === "A learner");

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:learn — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:learn — ${pass}/${pass} passed`);
