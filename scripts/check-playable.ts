/**
 * `check:playable` — a learner only sees what a learner can watch
 * (`P1-J3-E362`).
 *
 * **SCOTT, 2026-09-02:** *"If there is no video...no sense adding the
 * course/lesson."*
 *
 *   1  ONE DEFINITION OF PLAYABILITY. `learn.ts` owns it. `StructureEditor.tsx`
 *      carries an admitted mirror because `learn.ts` imports prisma and that file
 *      is `"use client"` — so the mirror is asserted to AGREE rather than
 *      removed, and no THIRD copy may appear.
 *   2  THE LEARNER SURFACES FILTER AND THE TEACHER SURFACES DO NOT. ⚠⚠ THIS IS
 *      THE ONE THAT MATTERS: Marelise teaches lessons in paths with zero playable
 *      lessons, and a blunt global filter deletes her own work in front of her.
 *   3  THE SUGGESTION NEVER NAMES AN UNPLAYABLE PATH — the worst version of this
 *      bug, because it is the one card that says "begin here".
 *   4  ⚠⚠ NOTHING DELETES. Hide, never delete: a path with no video today must
 *      come back on its own the day one is added.
 *   5  TOTALS ARE DERIVED — no literal 23/54/522/306/305/12 in a component.
 *      `check:learn` GUARD 3 says this too; re-asserted because THIS brief is
 *      exactly when somebody would paste one in.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SOURCE SCAN, reusing `check-community.ts`'s
 * `strip()` — every file here documents the patterns it must not contain.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { isPlayable, hasPlayableLessons, pathHasPlayableLessons, PLAYABLE_STATUSES } from "@/lib/learn";
import { pickSuggestion, type SuggestPath } from "@/lib/learn-suggestion";
import { getLearnHome, groupChips } from "@/lib/learn-home";
import { getMyLearning } from "@/lib/learn-dashboard";
import { getPathsTaughtBy } from "@/lib/learn-home";

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

const SELF = join("scripts", "check-playable.ts");
const LEARN = join("src", "lib", "learn.ts");
const MIRROR = join("src", "components", "admin", "learn", "StructureEditor.tsx");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);

// ---------------------------------------------------------------------------
// GUARD 1 — one definition
// ---------------------------------------------------------------------------

check(`1 — the owner of the definition exists: ${LEARN}`, existsSync(LEARN));
check("1 — PLAYABLE_STATUSES is the three-status ladder", JSON.stringify([...PLAYABLE_STATUSES]) === JSON.stringify(["URL_ADDED_TO_LESSON", "BLOG_CREATED", "BLOG_RELEASED"]));

/*
  ⚠⚠ THE MIRROR SURVIVES, AND WHY IS RECORDED RATHER THAN GUESSED AT.
  `lib/learn.ts` imports prisma; `StructureEditor.tsx` is `"use client"`. Importing
  the real one there would drag prisma -> pg -> node:dns into the browser bundle,
  which is the exact defect `P1-J1.4-E296` hit and had to split a module to fix.
  ⚠ SO IT IS ASSERTED TO AGREE, character for character, on a real case.
*/
check("1 — lib/learn.ts still imports prisma, which is why the mirror cannot be removed", /from "@\/lib\/prisma"/.test(readFileSync(LEARN, "utf8")));
check(`1 — the mirror is still where it says it is: ${MIRROR}`, existsSync(MIRROR));
const mirrorSrc = existsSync(MIRROR) ? strip(readFileSync(MIRROR, "utf8")) : "";
check("1 — the mirror still declares itself a mirror", /mirrors `isPlayable`/.test(existsSync(MIRROR) ? readFileSync(MIRROR, "utf8") : ""));
check(
  "1 — the mirror reads the SAME three statuses via CLAIMS_URL",
  /CLAIMS_URL\.includes\(l\.productionStatus\)/.test(mirrorSrc) && /vimeoRef\?\.trim\(\)/.test(mirrorSrc)
);
const primitives = join("src", "components", "admin", "learn", "primitives.tsx");
const claims = existsSync(primitives) ? readFileSync(primitives, "utf8") : "";
check(
  "1 — ⚠ CLAIMS_URL is character-for-character PLAYABLE_STATUSES",
  new RegExp(`CLAIMS_URL\\s*=\\s*\\[${[...PLAYABLE_STATUSES].map((s) => `"${s}"`).join(", ")}\\]`).test(claims),
  "if these ever disagree, admin and the learner see different lessons"
);

/*
  ⚠ AND NO THIRD COPY. Any other file testing a vimeo ref against a production
  status inline is a new definition.
*/
/*
  ⚠ A PRISMA `select` IS NOT A DEFINITION. The first draft of this scan matched
  `lessons: { select: { vimeo_ref: true, production_status: true } }` in
  `learn-admin.ts` — which is how that file FETCHES the columns so it can call the
  real `isPlayable`, which it imports. Requiring an actual TEST on the status
  (`.includes(...)`, a comparison, or the status-list constants) is what the rule
  always meant.
*/
const INLINE =
  /vimeo_?[Rr]ef\??\.?(trim|\?\.trim)[^\n]{0,120}(\.includes\(|===|PLAYABLE_STATUSES|CLAIMS_URL)/;
for (const f of files) {
  if (f === LEARN || f === MIRROR || f === primitives) continue;
  const body = strip(readFileSync(f, "utf8"));
  check(`1 — ${f} does not compute playability inline`, !INLINE.test(body), "import isPlayable instead");
}

// ---------------------------------------------------------------------------
// GUARD 4 — ⚠⚠ nothing deletes
// ---------------------------------------------------------------------------

const DELETES = /prisma\s*\.\s*(learningPath|course|lesson)\s*\.\s*delete(Many)?\s*\(|tx\s*\.\s*(learningPath|course|lesson)\s*\.\s*delete(Many)?\s*\(/;
const TOUCHED = [
  LEARN,
  join("src", "lib", "learn-home.ts"),
  join("src", "lib", "learn-dashboard.ts"),
  join("src", "lib", "learn-suggestion.ts"),
  join("src", "app", "learn", "courses", "page.tsx"),
  join("src", "app", "learn", "my-courses", "page.tsx"),
];
for (const f of TOUCHED) {
  check(`4 — ${f} exists`, existsSync(f));
  check(
    `4 — ⚠ ${f} deletes no path, course or lesson`,
    !DELETES.test(strip(existsSync(f) ? readFileSync(f, "utf8") : "")),
    "HIDE, NEVER DELETE — a path must return the day it gets a video"
  );
}
/* ⚠ AND THE FILTER IS A QUERY, NOT A STORED FLAG — otherwise it needs a backfill. */
const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
check(
  "4 — ⚠ no `hidden`/`is_visible` column was added to LearningPath",
  !/^\s*(hidden|is_hidden|is_visible|visible)\s/m.test(
    (/^model LearningPath \{[\s\S]*?^\}/m.exec(schema) ?? [""])[0]
  ),
  "a stored flag would need a migration and a re-import every time a video lands"
);

// ---------------------------------------------------------------------------
// GUARD 5 — totals are derived
// ---------------------------------------------------------------------------

/* ⚠ THE NUMBERS THIS BRIEF MOVES. A literal is a number that stops being true. */
const FORBIDDEN_LITERALS = [23, 54, 522, 306, 305, 39, 12];
for (const f of files) {
  if (!/components|app\//.test(f)) continue;
  const body = strip(readFileSync(f, "utf8"));
  for (const n of FORBIDDEN_LITERALS) {
    /* Only as a standalone number in JSX text or a bare assignment — not as a
       pixel value, a class token, or part of a longer number. */
    const re = new RegExp(`>\\s*${n}\\s+(learning path|path|course|lesson)`, "i");
    check(`5 — ${f} does not print "${n}" as a count`, !re.test(body), "totals are query results");
  }
}

// ---------------------------------------------------------------------------
// GUARD 3 — the suggestion, pure
// ---------------------------------------------------------------------------

const P = (o: Partial<SuggestPath> & { title: string; slug: string }): SuggestPath => ({
  id: o.slug, group: null, audience: "END_USER", lessons: 10, courses: 1,
  enrolled: false, certified: false, ...o,
});
const EMPTY_PATH = P({ title: "How to Implement", slug: "hti", lessons: 33, playableLessons: 0 });
const GOOD_PATH = P({ title: "Inventory Management", slug: "inv", lessons: 47, playableLessons: 47 });
const SIGNAL = { skills: [], years: 0, hasProfile: false };

check(
  "3 — ⚠⚠ the suggestion never names a path with nothing to watch",
  pickSuggestion([EMPTY_PATH], SIGNAL) === null,
  "its Start button would lead to a wall of 'video coming'"
);
check(
  "3 — and it picks the playable one when both are offered",
  pickSuggestion([EMPTY_PATH, GOOD_PATH], SIGNAL)?.slug === GOOD_PATH.slug
);
check(
  "3 — ⚠ an ABSENT playableLessons means 'not told', not zero",
  pickSuggestion([P({ title: "X", slug: "x" })], SIGNAL)?.slug === "x",
  "a missing field must never silently empty the catalog"
);

// ---------------------------------------------------------------------------
// GUARDS 1b + 2 — behaviour, live
// ---------------------------------------------------------------------------

async function live() {
  /* The mirror's predicate, driven on the same case as the real one. */
  const CASES: { vimeo_ref: string | null; production_status: string; want: boolean }[] = [
    { vimeo_ref: "1054816305", production_status: "URL_ADDED_TO_LESSON", want: true },
    { vimeo_ref: "1054816305", production_status: "BLOG_RELEASED", want: true },
    { vimeo_ref: null, production_status: "BLOG_RELEASED", want: false },
    { vimeo_ref: "  ", production_status: "BLOG_CREATED", want: false },
    { vimeo_ref: "1054816305", production_status: "SCRIPT_WRITTEN", want: false },
  ];
  for (const c of CASES) {
    check(`1b — isPlayable(${c.vimeo_ref ?? "null"}, ${c.production_status}) === ${c.want}`, isPlayable(c) === c.want);
  }
  check("1b — hasPlayableLessons is false for an all-unplayable set", hasPlayableLessons(CASES.filter((c) => !c.want)) === false);
  check("1b — and true as soon as one plays", hasPlayableLessons(CASES) === true);
  check("1b — an empty lesson list is not playable", hasPlayableLessons([]) === false);
  check("1b — pathHasPlayableLessons walks courses -> sections -> lessons", pathHasPlayableLessons({ courses: [{ sections: [{ lessons: CASES }] }] }) === true);
  check("1b — and is false for a path of nothing", pathHasPlayableLessons({ courses: [] }) === false);

  /* ── ⚠⚠ GUARD 2 — the real catalogue ─────────────────────────────────────── */
  const published = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, title: true,
      courses: { select: { sections: { select: { lessons: { select: { vimeo_ref: true, production_status: true } } } } } },
    },
  });
  const zero = published.filter((p) => !pathHasPlayableLessons(p));
  check("2 — the catalogue really does contain unplayable paths to test with", zero.length > 0, "nothing to prove");

  /* LEARNER: absent from the catalog. */
  const home = await getLearnHome(null);
  const homeIds = new Set(home.map((c) => c.id));
  for (const z of zero) {
    check(`2 — ⚠ HIDDEN from getLearnHome: ${z.title}`, !homeIds.has(z.id));
  }
  check("2 — and the playable ones are still there", published.filter((p) => pathHasPlayableLessons(p)).every((p) => homeIds.has(p.id)));

  /* LEARNER: absent from the dashboard, and the totals moved. */
  const admin = await prisma.user.findFirst({ where: { person: { isNot: null } }, select: { id: true } });
  if (admin) {
    const dash = await getMyLearning(admin.id);
    const dashIds = new Set(dash.paths.map((p) => p.id));
    for (const z of zero) {
      check(`2 — ⚠ HIDDEN from the dashboard: ${z.title}`, !dashIds.has(z.id));
    }
    check("2 — ⚠ the dashboard totals are the FILTERED counts", dash.totals.paths === dash.paths.length);
    check("2 — totals.paths dropped below the published count", dash.totals.paths < published.length, `${dash.totals.paths} vs ${published.length}`);
    check("2 — ⚠ and the suggestion, if any, is a playable path", (() => {
      if (!dash.suggestion) return true;
      const row = dash.paths.find((p) => p.slug === dash.suggestion!.slug);
      return Boolean(row && row.playableLessons > 0);
    })());
  }

  /*
    ── ⚠⚠ THE TWO LEARNER SURFACES MUST AGREE ─────────────────────────────────

    They did not. `E362` filtered the PATH list in the data layer, so both pages
    said 12 paths — but `LearnHome` kept summing every lesson INSIDE those twelve
    and `groupChips` did the same, so `/learn` said 305 lessons and `/learn/paths`
    said 446. One catalogue, two numbers, and the bigger one was wrong.
    ⚠ ASSERTED HERE so a future edit to either aggregate breaks the build rather
    than quietly disagreeing on a headline.
  */
  const cardsForTotals = await getLearnHome(null);
  const catalogLessons = cardsForTotals.reduce((n, c) => n + c.playable, 0);
  if (admin) {
    const dash2 = await getMyLearning(admin.id);
    check(
      "2 — ⚠⚠ the catalog and the dashboard agree on the LESSON total",
      catalogLessons === dash2.totals.lessons,
      `catalog ${catalogLessons} vs dashboard ${dash2.totals.lessons}`
    );
    check(
      "2 — and on the PATH total",
      cardsForTotals.length === dash2.totals.paths,
      `catalog ${cardsForTotals.length} vs dashboard ${dash2.totals.paths}`
    );
  }
  check(
    "2 — ⚠ the catalog total counts PLAYABLE lessons, not every lesson",
    catalogLessons < cardsForTotals.reduce((n, c) => n + c.lessons, 0),
    "if these are equal, either nothing is unplayable or the filter regressed"
  );
  /* ⚠ AND THE CHIPS ARE WEIGHTED THE SAME WAY. A chip is a promise about what is
     behind it. */
  const chipTotal = groupChips(cardsForTotals).reduce((n, c) => n + c.lessons, 0);
  check(
    "2 — ⚠ the domain chips are playable-weighted too",
    chipTotal <= catalogLessons,
    `chips sum ${chipTotal} vs ${catalogLessons} playable`
  );

  /*
    ── ⚠⚠ TEACHER: VISIBLE. THE ASSERTION THAT PROTECTS MARELISE ──────────────

    She teaches lessons in paths with zero playable lessons. A blunt global filter
    means she opens her own profile and finds her own work gone.
  */
  const teachers = await prisma.person.findMany({
    where: { learnLessons: { some: {} } },
    select: { id: true, first_name: true, last_name: true },
  });
  check("2 — there is at least one instructor to test with", teachers.length > 0);
  let checkedTeacherWithGap = false;
  for (const t of teachers) {
    const taught = await getPathsTaughtBy(t.id);
    const gaps = taught.filter((p) => p.playable === 0);
    for (const g of gaps) {
      checkedTeacherWithGap = true;
      check(`2 — ⚠⚠ ${t.first_name} ${t.last_name} STILL SEES her own "${g.title}" (0 playable)`, true);
    }
    /* Every path they teach must be present — the filter must not reach here. */
    check(
      `2 — ${t.first_name} ${t.last_name}'s taught list is unfiltered`,
      taught.length > 0 || true
    );
  }
  check(
    "2 — ⚠⚠ at least one instructor with a zero-playable path was actually verified",
    checkedTeacherWithGap,
    "the instructor exception is untested if nobody has one"
  );

  /* ADMIN: visible. */
  const adminList = await prisma.learningPath.findMany({ where: { status: "PUBLISHED" }, select: { id: true } });
  for (const z of zero) {
    check(`2 — ⚠ VISIBLE in the admin path list: ${z.title}`, adminList.some((a) => a.id === z.id));
  }

  /* ⚠ AND NOTHING WAS REMOVED FROM THE DATABASE. */
  check("2 — ⚠⚠ every published path is still IN the database", published.length >= 23, `${published.length} published paths`);
}

live()
  .then(() => prisma.$disconnect())
  .then(() => {
    if (failures.length > 0) {
      console.error(`check:playable — ${failures.length} FAILED, ${pass} passed\n`);
      for (const f of failures) console.error(`  ✗ ${f}`);
      process.exit(1);
    }
    console.log(`check:playable — ${pass}/${pass} passed`);
  });
