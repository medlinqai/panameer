import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathStages, currentStageIndex } from "@/components/learn/app/PathStages";
import { courseTotals, type CourseGroup } from "@/lib/learn-courses";

let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.tsx?$/.test(f)) out.push(f);
  }
  return out;
}

/* ── §1 THE POPULATION, ASSERTED BEFORE ANYTHING IS SCANNED ──────────────── */

const PATHS_PAGE = join("src", "app", "learn", "paths", "page.tsx");
const COURSES_PAGE = join("src", "app", "learn", "courses", "page.tsx");
const PATH_PAGE = join("src", "app", "learn", "[slug]", "page.tsx");
const APP_PATH = join("src", "components", "learn", "app", "AppPath.tsx");
const TABS = join("src", "components", "learn", "app", "LearnTabs.tsx");
const STAGES = join("src", "components", "learn", "app", "PathStages.tsx");
const SPINE = join("src", "components", "learn", "app", "PathSpine.tsx");
const COURSES_LIB = join("src", "lib", "learn-courses.ts");

const NAMED = [PATHS_PAGE, COURSES_PAGE, PATH_PAGE, APP_PATH, TABS, STAGES, SPINE, COURSES_LIB];

const body = new Map<string, string>();
for (const f of NAMED) {
  let raw: string | null = null;
  try {
    raw = readFileSync(f, "utf8");
  } catch {
    raw = null;
  }
  check(`§1 population — the file this gate is about exists: ${f}`, raw !== null);
  if (raw !== null) body.set(f, strip(raw));
}

/* ⚠⚠ AND THE DIRECTORIES THE BRIEF NAMES ARE NON-EMPTY. A renamed folder would
   otherwise empty the scan while every `readFileSync` above still passed. */
for (const d of [
  join("src", "app", "learn", "paths"),
  join("src", "app", "learn", "[slug]"),
  join("src", "app", "learn", "courses"),
  join("src", "components", "learn", "app"),
]) {
  let n = 0;
  try {
    n = walk(d).length;
  } catch {
    n = 0;
  }
  check(`§1 population — ${d} is in the scan and is not empty`, n > 0, `${n} files`);
}

const get = (f: string) => body.get(f) ?? "";

/* ── §2 THE FRAME — THE TAB ROW ON ALL THREE VIEWS ───────────────────────── */

/*
  ⚠ SCOTT: *"It is wrong and there are ZERO tabs."* ⚠⚠ A member who clicked into
  the catalogue or a path lost Learn's navigation entirely. ⚠⚠⚠ THE ROW IS
  MOUNTED, NOT RESTATED — `E627` extracted it precisely so a second copy could
  not drift, so each page must reference the COMPONENT.
*/
for (const [f, active] of [
  [PATHS_PAGE, "paths"],
  [COURSES_PAGE, "courses"],
] as const) {
  const src = get(f);
  check(`§2 ${f} mounts LearnTabs`, /<LearnTabs\b/.test(src));
  check(
    `§2 ${f} declares active="${active}" — the row names the page you are on`,
    new RegExp(`active=["']${active}["']`).test(src)
  );
}
check("§2 the path view mounts LearnTabs", /<LearnTabs\b/.test(get(PATH_PAGE) + get(APP_PATH)));

for (const f of [PATHS_PAGE, COURSES_PAGE]) {
  check(
    `§2 ${f} gates the tab row on a viewer`,
    /\{\s*viewer\s*&&\s*<LearnTabs/.test(get(f)),
    "the row must be signed-in only"
  );
}

/*
  ── ⚠⚠⚠ §3 THE ROW WRAPS. `E609`, AND THE ACTIVE TAB IS WHY ──────────────

  ⚠ MEASURED AT 390px: five tabs, three fitted, and on `/learn/courses` the
  ACTIVE tab was off-screen — **a row that lights nothing on its own page.**
  ⚠⚠ `overflow-x-auto` here is the defect, because `LearnTabs` is a SERVER
  component and cannot scroll itself into view (`E378` WS-5 rejected making it a
  client component to do that in JS).
*/
const tabs = get(TABS);
check("§3 the tab row wraps rather than scrolling (E609)", /flex-wrap/.test(tabs));
check(
  "§3 the tab row carries no horizontal scroller",
  !/overflow-x-auto/.test(tabs),
  "a scroller can hide the active tab"
);
/* ⚠⚠ THE ACTIVE TAB IS A `<span>`, NEVER A `<Link>` TO ITSELF — `E023`. */
check(
  "§3 the active tab is not a link to the page you are on",
  /active === "my-learning" \? \(\s*<span/.test(tabs) ||
    /\{active === "[a-z-]+" \? <span/.test(tabs.replace(/\s+/g, " ")),
  "the current tab must render as a span"
);

/* ── §4 FORBIDDEN COPY, BY SHAPE (ruling 26a + 54) ───────────────────────── */

/*
  ⚠⚠⚠ RULING 54 CLOSED THIS FOR GOOD. Scott: *"we used to require you to watch
  the classes to get the test...but that changed in this version."* ⚠ The test is
  open to anyone; **nothing on any screen may say otherwise.**
  ⚠⚠ `E627` found the gate in THREE places — the padlock glyph, the sentence,
  and the LINK'S OWN RENDER CONDITION — so this bans the shape, not one string.
*/
const LEARN_VIEW_FILES = [APP_PATH, PATHS_PAGE, COURSES_PAGE, PATH_PAGE, STAGES, SPINE];
const allViews = LEARN_VIEW_FILES.map(get).join("\n");

const FORBIDDEN: [string, RegExp][] = [
  ["unlocks at 100", /unlocks?\s+at\s+100/i],
  ["test unlocks", /test\s+unlocks/i],
  ["unlocks when all N lessons are complete", /unlocks?\s+when\s+all/i],
  ["a padlock glyph", /\bLock\b\s*(className|\/>)/],
  ["the retired level surface (E606, narrowed by 36a)", /\b(levelFor|LEVEL_BANDS|LevelState|clientComputed)\b/],
];
for (const [label, re] of FORBIDDEN) {
  check(`§4 no "${label}" survives in Learn's views`, !re.test(allViews));
}

check(
  "§4 the path test link is not gated on completion (53b — E579 inverted)",
  !/allDone\s*&&[\s\S]{0,120}\/test/.test(get(APP_PATH)),
  "the test link must not render only when every lesson is done"
);

const stageFixture = {
  slug: "p",
  enrolled: false,
  percent: 0,
  testExists: true,
  testReady: false,
  testPassed: false,
  certificateEarned: false,
  certificateUrl: null as string | null,
};
const firstNotDone = currentStageIndex;

const notStarted = pathStages(stageFixture);
check("§5 four stages, always", notStarted.length === 4, `${notStarted.length}`);
check(
  "§5 not enrolled — the current stage is Enrolled",
  firstNotDone(notStarted) === 0 && notStarted[0].label === "Enrolled"
);
check("§5 Enrolled has no destination (E579 — a state is not a place)", notStarted[0].href === null);

const midway = pathStages({ ...stageFixture, enrolled: true, percent: 45 });
check(
  "§5 enrolled and part-way — the current stage is Courses",
  firstNotDone(midway) === 1 && midway[0].done === true
);
/*
  ⚠⚠ THE PERCENTAGE IS IN THE LABEL AND IT IS THE REAL ONE. ⚠⚠⚠ THE FIXTURE
  USES 45, NOT 0 AND NOT 100 — *"two zeros agree; two ones agree."* A fixture
  whose percent is 0 cannot tell a label that reads the value from one that
  prints a constant.
*/
check("§5 the Courses stage states the measured percent", midway[1].label === "45% Courses");

const doneNoTest = pathStages({ ...stageFixture, enrolled: true, percent: 100 });
check(
  "§5 lessons complete, no published set — Path Test is current and UNLINKED",
  firstNotDone(doneNoTest) === 2 && doneNoTest[2].href === null
);
const doneTestReady = pathStages({ ...stageFixture, enrolled: true, percent: 100, testReady: true });
check(
  "§5 a published set links the Path Test stage",
  doneTestReady[2].href === "/learn/p/test"
);
/*
  ⚠⚠⚠ RULING 54, AS ARITHMETIC: the test links at ANY progress, not only at
  100%. ⚠ If this ever fails, the completion gate has come back through the
  derivation rather than through copy — which is exactly where `E627` found it.
*/
const zeroTestReady = pathStages({ ...stageFixture, enrolled: true, percent: 0, testReady: true });
check(
  "§5 ruling 54 — the test links at 0% too, not only when the path is done",
  zeroTestReady[2].href === "/learn/p/test"
);

const certified = pathStages({
  ...stageFixture,
  enrolled: true,
  percent: 100,
  testReady: true,
  testPassed: true,
  certificateEarned: true,
  certificateUrl: "/verify/abc",
});
check("§5 every stage done — no stage is current", firstNotDone(certified) === -1);
check("§5 an earned certificate links to its credential", certified[3].href === "/verify/abc");
check(
  "§5 an unearned certificate has no destination",
  doneTestReady[3].href === null,
  "an unearned certificate must not link"
);

/*
  ── ⚠⚠⚠ §5b THE UNAVAILABLE STAGE (Scott, 2026-09-25 — overturning my call) ──

  ⚠ *"A rail already carries states — done, current, upcoming — so 'not
  available on this path' is another state, not a missing node. Keep four stages
  everywhere; on a path with no assessment, Certificate renders unavailable,
  unlinked, with its reason."*
  ⚠⚠ **THE SHAPE STAYS THE PATTERN, THE CONTENT STAYS HONEST.**
*/
const noTest = pathStages({ ...stageFixture, enrolled: true, percent: 100, testExists: false });
check("§5b four stages still, on a path with no test", noTest.length === 4);
check(
  "§5b Path Test is unavailable and carries a reason",
  noTest[2].unavailable !== undefined && (noTest[2].unavailable ?? "").length > 0,
  "an unavailable stage with no reason is a bare dash"
);
check(
  "§5b Certificate is unavailable and carries a reason",
  noTest[3].unavailable !== undefined && (noTest[3].unavailable ?? "").length > 0
);
check("§5b an unavailable stage is never linked (E579)", noTest[2].href === null && noTest[3].href === null);
/*
  ⚠⚠⚠ THE ONE THAT CATCHES THE REGRESSION SCOTT NAMED. With the courses done and
  no test on the path, **nothing may be current** — lighting `Path Test` as *"you
  are here"* points a member at a stage that does not exist.
*/
check(
  "§5b nothing is current when the remaining stages cannot be reached",
  firstNotDone(noTest) === -1,
  "an unavailable stage must never read as 'you are here'"
);
/*
  ⚠⚠ AND THE DISTINCTION THAT KEEPS THIS FROM BEING RULING 26a's GATE IN A NEW
  COAT: a DRAFT question set is NOT unavailable. The test exists; it is simply
  not linked, and the test page says so honestly.
*/
const draftTest = pathStages({ ...stageFixture, enrolled: true, percent: 100, testExists: true });
check(
  "§5b a test that exists but is unpublished is NOT unavailable",
  draftTest[2].unavailable === undefined && draftTest[2].href === null,
  "only the absence of the row earns the reason"
);
check(
  "§5b and that path's Path Test is still the current stage",
  firstNotDone(draftTest) === 2
);

/*
  ⚠⚠⚠ NO LOCKED STATE CAN BE EXPRESSED. Ruling 26a's padlock cannot return
  through a caller that forgets, because the vocabulary has no word for it.
  ⚠ `unavailable` is NOT that word: a padlock claims PERMISSION (*you may not*),
  and this claims **the thing itself does not exist on this path**. The gate
  above holds the difference; this one holds the vocabulary.
*/
const disc = strip(readFileSync(join("src", "components", "casing", "StepDisc.tsx"), "utf8"));
check(
  "§5 the step disc offers no locked or disabled state (ruling 54)",
  !/\block(ed)?\b|\bdisabled\b/i.test(disc)
);
check(
  "§5b the unavailable disc renders a dash, not a number",
  /state === "unavailable" \? "\\u2014"/.test(disc) || /unavailable" \? "—"/.test(disc),
  "the dash is the shared mark for something that cannot be counted or reached"
);

/* ── §6 `/learn/courses` SHOWS COURSES (ruling 53d, and E362's defect) ───── */

/*
  ⚠⚠⚠ THE DEFECT THIS EXISTS TO PREVENT IS A RETURN, NOT A NEW ONE. This route
  once rendered `PathCard` — learning PATHS — under the heading "All Courses",
  off the same query `/learn/paths` uses. **Two URLs, one page, one of them named
  after a thing it did not show.**
*/
const coursesPage = get(COURSES_PAGE);
check("§6 the courses page reads the course catalogue", /getLearnCourses\b/.test(coursesPage));
check(
  "§6 the courses page does NOT render path cards (E362)",
  !/<PathCard\b/.test(coursesPage) && !/getLearnHome\s*\(/.test(coursesPage),
  "a page named Courses must not list paths"
);
check(
  "§6 the courses route is no longer a redirect (ruling 53d)",
  !/permanentRedirect\s*\(/.test(coursesPage)
);
/*
  ⚠⚠ `E316` — IT MUST STAY PUBLIC. *"A gate there turns the public hero's second
  CTA into a login wall."* ⚠ The viewer is read for the TAB ROW only, so no
  `redirect(` may appear in this file at all.
*/
check(
  "§6 the courses page gates nothing on a viewer (E316)",
  !/\bredirect\s*\(/.test(coursesPage) && !/notFound\s*\(/.test(coursesPage)
);
/* ⚠ ONE DEFINITION OF PLAYABLE — imported, never re-expressed (`E610`). */
const coursesLib = get(COURSES_LIB);
check("§6 the course catalogue imports isPlayable", /import\s*\{[^}]*\bisPlayable\b/.test(coursesLib));
check(
  "§6 it does not re-express playable as a Prisma where (E610)",
  !/PLAYABLE_STATUSES\s*\]?\s*\}/.test(coursesLib) && !/production_status:\s*\{\s*in:/.test(coursesLib)
);
/* ⚠⚠ PUBLISHED PATHS ONLY — a course on a draft path has no door (`E579`). */
check(
  "§6 only PUBLISHED paths are listed",
  /status:\s*"PUBLISHED"/.test(coursesLib)
);

/*
  ⚠⚠ THE HEADER'S FIGURES COME FROM THE ROWS THE PAGE DRAWS, so it cannot
  disagree with the list beneath it. ⚠⚠⚠ THE FIXTURE MAKES ALL THREE FIGURES
  DIFFERENT — 5 courses across 2 paths with 3 playable — because *"two zeros
  agree"*: a fixture where they coincide cannot tell `courses` from `paths`.
*/
const groups: CourseGroup[] = [
  {
    pathSlug: "a",
    pathTitle: "A",
    group: null,
    audience: "END_USER",
    courses: [
      { id: "1", title: "t", slug: "s", summary: null, href: "/x", pathSlug: "a", pathTitle: "A", group: null, audience: "END_USER", lessons: 4, playable: 4 },
      { id: "2", title: "t", slug: "s", summary: null, href: "/x", pathSlug: "a", pathTitle: "A", group: null, audience: "END_USER", lessons: 3, playable: 1 },
      { id: "3", title: "t", slug: "s", summary: null, href: "/x", pathSlug: "a", pathTitle: "A", group: null, audience: "END_USER", lessons: 2, playable: 0 },
    ],
  },
  {
    pathSlug: "b",
    pathTitle: "B",
    group: null,
    audience: "END_USER",
    courses: [
      { id: "4", title: "t", slug: "s", summary: null, href: "/x", pathSlug: "b", pathTitle: "B", group: null, audience: "END_USER", lessons: 9, playable: 2 },
      { id: "5", title: "t", slug: "s", summary: null, href: "/x", pathSlug: "b", pathTitle: "B", group: null, audience: "END_USER", lessons: 1, playable: 0 },
    ],
  },
];
const t = courseTotals(groups);
check("§6 courses counts every course, not every path", t.courses === 5, String(t.courses));
check("§6 paths counts the groups", t.paths === 2, String(t.paths));
check(
  "§6 'with video' counts courses that have ANY playable lesson, not all of them",
  t.playable === 3,
  String(t.playable)
);
/* ⚠⚠ AND THE THREE ARE DISTINCT, so a cell pointed at the wrong field cannot
   pass by coincidence — the guard `E603` WS-C was missing. */
check(
  "§6 the three figures are distinct in the fixture (two zeros agree)",
  new Set([t.courses, t.paths, t.playable]).size === 3
);

/* ── §7 THE CERTIFICATE IS NOT PROMISED WHERE NONE CAN BE EARNED (E632) ──── */

/*
  ⚠⚠⚠ MEASURED: 15 of 23 paths have no assessment row, and `Certification` where
  `issued_from = "LEARN"` holds ZERO rows. A certificate comes from passing the
  path test — **no test, no certificate.** ⚠ The claim was written out in THREE
  places and was wrong in all of them at once (`E585`).
*/
const appPath = get(APP_PATH);
check(
  "§7 the CERTIFICATE figure is conditional on the path having a test",
  /path\.test\.exists\s*&&\s*<Stat\b/.test(appPath),
  "a hard-coded 1 is a figure with no writer"
);
check(
  "§7 no bare <Stat n={1} label=\"CERTIFICATE\" /> survives",
  !/(?<!exists\s*&&\s*)<Stat\s+n=\{1\}\s+label="CERTIFICATE"/.test(appPath.replace(/\s+/g, " ")) ||
    /path\.test\.exists\s*&&\s*<Stat\s+n=\{1\}/.test(appPath.replace(/\s+/g, " "))
);
check(
  "§7 the certificate node renders only where one can be earned",
  /path\.test\.exists\s*&&\s*\(/.test(appPath)
);
/* ⚠ AND THE SENTENCES. Both promised a prize 15 paths cannot award. */
const certSentences = (appPath.match(/between\s+you\s+and\s+the\s+certificate/g) ?? []).length;
const guardedSentences = (appPath.match(/path\.test\.exists/g) ?? []).length;
check(
  "§7 every 'between you and the certificate' sentence sits behind test.exists",
  certSentences === 0 || guardedSentences >= 3,
  `${certSentences} sentence(s), ${guardedSentences} guard(s)`
);

/* ── §8 THE PATH VIEW KEEPS WHAT ITEM 3 WOULD HAVE DELETED ───────────────── */

/*
  ⚠⚠ WS-C item 3 proposed replacing the spine with a flat numbered list. It was
  REPORTED AND NOT BUILT: the spine already numbers, ticks, counts, highlights
  the current course and draws a per-course bar — and a flat list would lose the
  section subheadings, the lesson rows and **the only per-lesson instructor
  attribution on the page.** ⚠⚠⚠ THIS PINS THAT REASONING so a later pass cannot
  quietly do the replacement the report argued against.
*/
const spine = get(SPINE);
check("§8 the course list keeps its per-lesson rows", /s\.lessons\.map\(/.test(spine));
check("§8 the course list keeps its section subheadings", /c\.sections\.map\(/.test(spine));
check(
  "§8 the course list keeps per-lesson instructor attribution",
  /l\.instructor\s*&&/.test(spine),
  "this page is the only place it appears"
);
check("§8 the course list keeps its per-course progress bar", /c\.percent/.test(spine));
check(
  "§8 the stage rail is mounted on the path view",
  /<PathStages\b/.test(appPath)
);

/* ── report ─────────────────────────────────────────────────────────────── */

for (const f of fails) console.log(`  ✗ ${f}`);
console.log(
  fails.length
    ? `check:learn-views — ${fails.length} FAILED, ${pass} passed`
    : `check:learn-views — ${pass} passed`
);
process.exit(fails.length ? 1 : 0);
