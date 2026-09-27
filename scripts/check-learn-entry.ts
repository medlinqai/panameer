import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { decideStarter, starterPath, getLearnHome, groupChips } from "@/lib/learn-home";
import { starterIsDone } from "@/lib/learn-dashboard";

/**
 * ── ⚠⚠⚠ `check:learn-entry` (`P2-A4-E683`) ──────────────────────────────
 *
 * ⚠⚠ **THE CONSTRAINT THAT SHAPES THE WHOLE BRIEF, AND THEREFORE THIS GATE:**
 * Scott, 2026-09-26 — *"I will ultimately want to get a better training provider
 * with a much bigger selection on the platform."* ⚠⚠⚠ **SO THE 54 COURSES ARE
 * TEMPORARY AND NO COURSE TITLE, PATH SLUG OR SKILL NAME MAY BE HARDCODED.** A
 * catalog swap must not require a code change, and §1 is what makes that a
 * failing build rather than a promise.
 *
 * ⚠ **IT WRITES NOTHING.** The starter rule is proved as a PURE function and the
 * live database is only READ — flagging a row to test ambiguity would publish a
 * probe path to real members on the one database that also serves production
 * (ruling 38).
 */
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => {
  if (ok) pass += 1;
  else fails.push(`${name}${why ? ` — ${why}` : ""}`);
};
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(d: string, o: string[] = []): string[] {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) walk(f, o);
    else if (/\.tsx?$/.test(f)) o.push(f);
  }
  return o;
}

async function main() {
  const SRC = walk("src");
  check("0 — the source scan has a population (E586)", SRC.length > 50, `${SRC.length}`);

  /* ── 1 · ⚠⚠⚠ NO CATALOG CONTENT IS HARDCODED ─────────────────────────────
     ⚠⚠ The titles and slugs are read FROM THE DATABASE and asserted absent from
     source, so this gate re-derives its own needles every run. ⚠⚠⚠ **IT CANNOT
     GO STALE WHEN THE CATALOG IS SWAPPED** — a hardcoded list of forbidden
     strings would be the very thing it is banning, one level up. */
  const paths = await prisma.learningPath.findMany({
    select: { title: true, slug: true, courses: { select: { title: true } } },
  });
  check("1 — the catalog has rows to check against (E586)", paths.length > 0, `${paths.length}`);
  /* ⚠ Short or generic names would match half the codebase and say nothing —
     `ERP`, `w`, `Beginners`. The rule is about IDENTIFIABLE catalog content, so
     the needle set is the names long enough to be unmistakably from it. */
  const needles = paths
    .flatMap((p) => p.courses.map((c) => c.title))
    .map((s) => (s ?? "").trim())
    .filter((s) => s.length >= 18);
  /*
    ── ⚠⚠⚠ SLUGS, ACROSS ALL OF `src/` — THE DEFECT THE BRIEF NAMES ─────────

    ⚠⚠ **THE BRIEF'S OWN WORDING: *"A HARDCODED SLUG would have to be found and
    edited by someone who does not know it exists."*** ⚠ Slugs are URL-shaped
    and unique, so unlike a path TITLE they collide with nothing — which is why
    this half needs **no scoping and no exclusions**, and is clean at zero today.

    ⚠⚠⚠ **PATH TITLES ARE DELIBERATELY NOT SCANNED, AND THAT IS MEASURED, NOT
    LAZY.** They are ordinary English that legitimately appears as other things:
    `"Contract Management"` is a **capability domain** in `capability-domains.ts`
    and both assessment banks; `"Implementers"` is the `LearnAudience` **enum
    label** in `learn.ts`. ⚠ Failing on those would flag correct code, and **a
    gate that fails on correct code is a gate someone switches off** (§10).
  */
  const slugs = paths.map((p) => p.slug).filter((s): s is string => !!s && s.length >= 6);
  check("1 — there are slugs to scan for (E586)", slugs.length > 10, `${slugs.length}`);
  const slugHits: string[] = [];
  for (const f of SRC) {
    const body = strip(readFileSync(f, "utf8"));
    for (const s of slugs) if (body.includes(s)) slugHits.push(`${f} :: ${s}`);
  }
  check(
    "1 — ⚠⚠⚠ NO path slug appears anywhere in src/ — the whole tree, no exclusions",
    slugHits.length === 0,
    `${slugHits.slice(0, 5).join(" | ")} — this is the defect the flag exists to avoid`
  );

  const unique = [...new Set(needles)];
  check("1 — and enough distinctive course titles to test with", unique.length > 10, `${unique.length}`);

  /*
    ── ⚠⚠⚠ THE POPULATION IS PART OF THE ASSERTION (`E610`), SO IT IS NAMED ──

    ⚠⚠ **THE FIRST VERSION OF THIS SCANNED ALL OF `src/` AND WENT RED ON FOUR
    FILES, AND ALL FOUR WERE FALSE.** Measured before believing it:
      · `admin/.../bulk-urls/page.tsx` — a CSV FORMAT EXAMPLE in help text
      · `admin/learn/PathForm.tsx`     — a `placeholder` attribute
      · `admin/learn/primitives.tsx`   — ⚠⚠ NOT CATALOG CONTENT AT ALL: the
        `LearnAudience` enum label `"Implementers"`, which collides with a path
        of the same name **by coincidence**
      · `learn/public/spine-shots.tsx` — a marketing ILLUSTRATION, dated
        2026-08-20 in its own comment
    ⚠⚠⚠ **NONE OF THEM IS A FUNCTIONAL DEPENDENCY: A CATALOG SWAP LEAVES EVERY
    ONE OF THEM WORKING**, merely showing a stale example. The rule is *"a swap
    must not require a CODE CHANGE"*, and stale illustrative copy does not.
    ⚠ **A GATE THAT FAILS ON CORRECT CODE IS A GATE SOMEONE SWITCHES OFF** (§10)
    — and the cost is not the false red, it is that people stop believing the
    green.

    ⚠⚠ **SO THE SCAN IS THE LEARN RUNTIME: what a member's page actually reads.**
    Admin authoring is ruling 21's, explicitly out of this brief; the marketing
    shots are illustration, the same class as a mockup (§7).
    ⚠ **THE EXCLUSIONS ARE ASSERTED TO STILL EXIST**, so a rename cannot silently
    widen the hole into a scan of nothing.
  */
  const EXCLUDED = [
    join("src", "components", "admin"),
    join("src", "app", "admin"),
    join("src", "components", "learn", "public"),
  ];
  for (const e of EXCLUDED) {
    check(`1 — the excluded surface ${e} still exists`, SRC.some((f) => f.startsWith(e)), e);
  }
  const RUNTIME = SRC.filter(
    (f) =>
      !EXCLUDED.some((e) => f.startsWith(e)) &&
      (f.startsWith(join("src", "lib")) ||
        f.startsWith(join("src", "app", "learn")) ||
        f.startsWith(join("src", "components", "learn")))
  );
  check("1 — the learn runtime has files to scan (E586)", RUNTIME.length > 10, `${RUNTIME.length}`);
  const offenders: string[] = [];
  for (const f of RUNTIME) {
    const body = strip(readFileSync(f, "utf8"));
    for (const n of unique) if (body.includes(n)) offenders.push(`${f} :: "${n}"`);
  }
  check(
    "1 — ⚠⚠ no distinctive course title appears in the Learn runtime",
    offenders.length === 0,
    `${offenders.slice(0, 5).join(" | ")} — a catalog swap must not need a code change`
  );

  /* ── 2 · ⚠⚠ THE RDS→COURSE LINK STAYS AT ZERO WRITERS ───────────────────
     ⚠ Scott withdrew it 2026-09-26: *"we don't want to show them courses for
     what they know… really just let them search."* ⚠⚠ Asserted so that building
     it later is a deliberate act with a failing gate in front of it, rather than
     something that drifts back in. */
  const writes = SRC.filter((f) => {
    const b = strip(readFileSync(f, "utf8"));
    return /courseSkill\s*\.\s*(create|createMany|upsert|update)/.test(b) ||
      /skill_scope\s*:/.test(b);
  });
  check(
    "2 — ⚠⚠ CourseSkill and Course.skill_scope still have ZERO writers",
    writes.length === 0,
    `${writes.join(", ")} — withdrawn by Scott, do not build it`
  );

  /* ── 3 · ⚠⚠⚠ THE STARTER IS A FLAG, NEVER A SLUG ────────────────────────── */
  const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");
  const lp = schema.slice(schema.indexOf("model LearningPath "));
  const lpBody = lp.slice(0, lp.indexOf("\n}"));
  check("3 — `is_starter` exists on LearningPath", /is_starter\s+Boolean/.test(lpBody));
  check(
    "3 — ⚠⚠ it defaults to FALSE, never true (E612)",
    /is_starter\s+Boolean\s+@default\(false\)/.test(lpBody),
    "a default of true makes every existing row a starter the moment the column lands"
  );
  /* ⚠⚠⚠ THE POINT OF THE WHOLE COLUMN: the selection reads the FLAG and nothing
     else, so a catalog swap marks a different row and no code changes. */
  const home = strip(readFileSync(join("src", "lib", "learn-home.ts"), "utf8"));
  check(
    "3 — ⚠⚠⚠ the starter is chosen by the flag, not by a slug or title",
    /is_starter:\s*true/.test(home) && !/slug:\s*["'`]/.test(home),
    "a hardcoded slug has to be found and edited by somebody who does not know it exists"
  );

  /* ── 4 · ⚠⚠⚠ MORE THAN ONE STARTER IS REFUSED, NOT RESOLVED ──────────────
     ⚠⚠ Scott, 2026-09-26: *"REFUSE and say so — do not silently take the first
     by sort_order."* ⚠ Proved on the PURE function, exhaustively, with no
     writes: flagging rows to test this would publish a probe path to real
     members (ruling 38). */
  check("4 — none marked reads as `none`", decideStarter([]).kind === "none");
  check("4 — exactly one is the answer", decideStarter([{ id: "a" }]).kind === "one");
  const two = decideStarter([{ id: "a" }, { id: "b" }]);
  check(
    "4 — ⚠⚠⚠ TWO marked paths are REFUSED, not resolved",
    two.kind === "ambiguous",
    `${two.kind} — silently taking the first by sort_order is how a second starter goes unnoticed`
  );
  check(
    "4 — ⚠ and the refusal names every id, so it can be fixed",
    two.kind === "ambiguous" && two.ids.length === 2 && two.ids.includes("b"),
    JSON.stringify(two)
  );
  check("4 — three are refused too", decideStarter([{ id: "a" }, { id: "b" }, { id: "c" }]).kind === "ambiguous");
  /* ⚠⚠ AND THE LIVE STATE, READ-ONLY. This is the half that actually reaches a
     person: if somebody flags a second path in the database, THIS fails. */
  const flagged = await prisma.learningPath.count({
    where: { is_starter: true, status: "PUBLISHED" },
  });
  check(
    "4 — ⚠⚠ at most ONE published path is flagged in the database today",
    flagged <= 1,
    `${flagged} are flagged — the page will refuse to show any starter until that is one`
  );
  const verdict = await starterPath(null);
  check(
    "4 — starterPath() agrees with the database",
    (flagged === 0 && verdict.kind === "none") ||
      (flagged === 1 && verdict.kind === "one") ||
      (flagged > 1 && verdict.kind === "ambiguous"),
    `flagged=${flagged} verdict=${verdict.kind}`
  );

  /* ── 5 · ⚠⚠⚠ WS-C — THE STARTER IS SHOWN UNTIL IT IS DONE, AND NOTHING ELSE
     ⚠⚠ Scott, 2026-09-26, replacing the withdrawn 2-years / no-RDS rule:
     *"I would always show them the foundations… every new user should go
     through those courses regardless."* */
  check("5 — nothing done, something to do → NOT done", !starterIsDone(25, 0));
  check("5 — partway → NOT done", !starterIsDone(25, 24));
  check("5 — all of them → done", starterIsDone(25, 25));
  /* ⚠⚠⚠ THE HALF THAT IS EASY TO DROP: without `playable > 0`, `0 >= 0` marks a
     path with nothing to watch COMPLETE the instant it is flagged, and the card
     a member must always see would never appear once. */
  check(
    "5 — ⚠⚠⚠ a path with NOTHING PLAYABLE is NOT done",
    !starterIsDone(0, 0),
    "0 >= 0 would mark an empty path complete the moment it is flagged"
  );
  check("5 — ⚠ and more completed than playable is still done, not stranded", starterIsDone(3, 5));

  const dash = strip(readFileSync(join("src", "lib", "learn-dashboard.ts"), "utf8"));
  /* ⚠⚠⚠ THE STARTER IS NOT GATED ON `continueCard`, AND THAT IS THE WHOLE
     DIFFERENCE FROM THE `suggestion` IT REPLACES. `suggestion` is the right half
     of an empty state and vanishes the moment a member has anything on the go;
     a member with three paths in flight still has not done the foundations. */
  const starterBlock = dash.slice(dash.indexOf("const starterVerdict"), dash.indexOf("return {", dash.indexOf("const starterVerdict")));
  check("5 — the starter block was found to scan (E586)", starterBlock.length > 50, `${starterBlock.length}`);
  check(
    "5 — ⚠⚠⚠ the starter is NOT gated on continueCard",
    !/continueCard/.test(starterBlock),
    "that gate is what made the old suggestion an empty-state half"
  );
  const ml = strip(readFileSync(join("src", "components", "learn", "app", "MyLearning.tsx"), "utf8"));
  check("5 — the page renders the starter card", /StarterPathCard/.test(ml));
  /* ⚠ RULING 53c: a measured zero renders as a COUNT in ink. `LessonProgress`
     holds 0 rows, so every member is at "0 of N" — a dash would say *we cannot
     count this*, which is false, and a percentage bar would say it unkindly. */
  check(
    "5 — ⚠⚠ the card prints a COUNT, not a percentage or a dash",
    /\{s\.completedLessons\} of \{s\.playable\}/.test(ml) &&
      !/starterPercent|s\.percent/.test(ml),
    "a measured zero renders as 0 in ink (53c)"
  );
  /*
    ── ⚠⚠⚠ WHAT IT REPLACES IS QUOTED, NOT DELETED (`E164`) ────────────────

    ⚠⚠ **THIS ONE READS THE RAW FILE, AND THE EXCEPTION IS THE WHOLE POINT.**
    Every other scan here strips comments first, because a live-code rule must
    not match an `E164` quote (rule 12). ⚠⚠⚠ **BUT THIS ASSERTION IS ABOUT THE
    QUOTE ITSELF** — the retired component now lives *inside* a comment, so a
    stripped read cannot see it and reports the opposite of the truth.
    ⚠ Caught by the gate going red the moment the component was correctly
    retired: the assertion was right about the rule and wrong about where to
    look.
  */
  const mlRaw = readFileSync(join("src", "components", "learn", "app", "MyLearning.tsx"), "utf8");
  check(
    "5 — ⚠ SuggestedFirstPath is still on disk, quoted not deleted",
    /function SuggestedFirstPath/.test(mlRaw),
    "E164 — superseded code is quoted, never deleted"
  );
  check(
    "5 — ⚠⚠ and it no longer RENDERS — the starter replaced it",
    !/<SuggestedFirstPath/.test(ml),
    "it drew the same path as the starter card, disagreeing about its size"
  );

  /* ── 6 · ⚠⚠⚠ WS-D — SEARCH, AND EVERY TRACK REACHABLE ──────────────────── */
  const learnHomeTsx = strip(readFileSync(join("src", "components", "learn", "LearnHome.tsx"), "utf8"));
  const cards = await getLearnHome(null);
  const chips = groupChips(cards);

  check(
    "6 — ⚠⚠⚠ the chip list is NOT sliced — every track is reachable",
    !/chips\.slice\(/.test(learnHomeTsx),
    "6 of 11 rendered left 5 tracks with no way in, and the cut was by playable weight, so the hidden five were the emptiest"
  );
  check("6 — there are chips to render", chips.length > 0, `${chips.length}`);
  /* ⚠⚠ THE COUNTS ARE PRINTED, NOT MERELY COMPUTED. `groupChips` has always
     returned `paths` and `lessons` and nothing read them (WS-D item 4). */
  check(
    "6 — ⚠ each chip prints its own count",
    /\{c\.paths\}/.test(learnHomeTsx),
    "the number groupChips computes was never rendered"
  );
  check(
    "6 — ⚠⚠ and the chip counts reconcile with the catalogue",
    chips.reduce((n, c) => n + c.paths, 0) === cards.length,
    `${chips.reduce((n, c) => n + c.paths, 0)} vs ${cards.length} — every card sits under exactly one chip`
  );

  /* ⚠⚠⚠ A SIGNED-IN MEMBER GETS THE SEARCH. It lived entirely in the
     `!signedIn` branch, so a member got neither the field nor the chips. */
  /*
    ⚠⚠ IT COUNTS THE INPUTS BOUND TO `query`, NOT A PLACEHOLDER STRING — and
    the first draft did the latter, which **survived its own mutation**: the
    identical text also sits in the `aria-label`, so changing the placeholder
    left the assertion matching. ⚠ An assertion pinned to a string that appears
    twice is pinned to nothing (§11).
    ⚠⚠⚠ TWO is the whole rule: one input in the signed-out hero, one for the
    member. One means a branch lost its search; three means somebody added a
    third surface without telling the filter.
  */
  const searchInputs = [...learnHomeTsx.matchAll(/value=\{query\}/g)].length;
  check(
    "6 — ⚠⚠⚠ the search renders for BOTH a visitor and a signed-in member",
    searchInputs === 2,
    `${searchInputs} inputs bound to query — it lived only in the !signedIn hero, so a member had no way to search at all`
  );
  /* ⚠⚠ ONE PREDICATE (`E585`). Two `.includes(needle)` filters would be two
     searches that can drift — the signed-out hero searching less than the
     signed-in catalogue, or the reverse. */
  const needleUses = [...learnHomeTsx.matchAll(/includes\(needle\)/g)].length;
  check(
    "6 — ⚠⚠ ONE search predicate serves both branches",
    needleUses === 1,
    `${needleUses} — two predicates are two searches that drift`
  );

  /* ⚠⚠⚠ THE SEARCH REACHES COURSES AND LESSONS, NOT JUST PATHS — proved on the
     DATA, not on the source, because the string is built server-side. */
  const homeLib = strip(readFileSync(join("src", "lib", "learn-home.ts"), "utf8"));
  check("6 — the card carries a searchText", /searchText/.test(homeLib));
  const withCourses = cards.filter((c) => c.searchText.length > 0);
  check("6 — every card has searchable text", withCourses.length === cards.length,
    `${withCourses.length} of ${cards.length}`);
  /* ⚠ A REAL LESSON TITLE MUST FIND ITS PATH. The needle is read from the
     database, so this cannot go stale when the catalog is swapped. */
  const lessonRow = await prisma.lesson.findFirst({
    where: { title: { not: "" } },
    select: { title: true, section: { select: { course: { select: { learning_path_id: true } } } } },
    orderBy: { title: "desc" },
  });
  if (lessonRow?.title && lessonRow.title.length >= 8) {
    const needle = lessonRow.title.toLowerCase();
    const hit = cards.find((c) => c.searchText.includes(needle));
    check(
      "6 — ⚠⚠⚠ searching a LESSON title finds its PATH",
      !!hit && hit.id === lessonRow.section.course.learning_path_id,
      `"${lessonRow.title}" -> ${hit ? hit.title : "no path"}`
    );
  } else {
    check("6 — a lesson title long enough to search with exists (E586)", false, "none");
  }
  const courseRow = await prisma.course.findFirst({
    where: { title: { not: "" } },
    select: { title: true, learning_path_id: true },
    orderBy: { title: "desc" },
  });
  if (courseRow?.title && courseRow.title.length >= 8) {
    const hit = cards.find((c) => c.searchText.includes(courseRow.title.toLowerCase()));
    check(
      "6 — ⚠⚠ searching a COURSE title finds its PATH",
      !!hit && hit.id === courseRow.learning_path_id,
      `"${courseRow.title}" -> ${hit ? hit.title : "no path"}`
    );
  }
  /*
    ⚠⚠⚠ AND EVERY RESULT TYPE LANDS ON THE PATH, WHICH IS TRUE BY CONSTRUCTION
    RATHER THAN BY A RULE SOMEBODY HAS TO REMEMBER. Scott, 2026-09-26: *"when
    anything is selected, the provider is shown the LP and asked to enroll…
    a course or lesson result does NOT open the course directly."*
    ⚠ There IS no course result and no lesson result to click — a match on
    either surfaces the PATH's card, and `PathCard` links to `/learn/[slug]`,
    which renders `EnrollButton`. **The rule cannot be violated because the
    other two result types do not exist as links.**
  */
  const card = strip(readFileSync(join("src", "components", "learn", "PathCard.tsx"), "utf8"));
  check(
    "6 — ⚠⚠ every result links to the PATH, never to a course or lesson",
    /\/learn\/\$\{card\.slug\}/.test(card) && !/\/course\/|\/lesson\//.test(card),
    "a course result that opened a course would skip the enrol prompt"
  );
  const pathPage = strip(readFileSync(join("src", "app", "learn", "[slug]", "page.tsx"), "utf8"));
  check(
    "6 — ⚠ and the path it lands on asks them to enrol",
    /EnrollButton/.test(pathPage),
    "landing on the path is only the rule if the path actually asks"
  );

  /* ⚠ THE CATALOGUE GROUPS BY TRACK (WS-D item 5). */
  check(
    "6 — the catalogue groups by track with a head per track",
    /grouped/.test(learnHomeTsx) && /grouped\.map/.test(learnHomeTsx),
    "the frame groups; the live page was a flat grid"
  );
  console.log(`   chips: ${chips.length} · ${chips.map((c) => `${c.group}(${c.paths})`).join(" ")}`);

  await prisma.$disconnect();
  console.log(`check:learn-entry — ${fails.length ? `${fails.length} FAILED, ` : ""}${pass} passed`);
  for (const f of fails) console.log(`\n  ✗ ${f}`);
  if (fails.length) process.exitCode = 1;
}

main();
