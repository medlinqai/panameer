/**
 * WHAT THE CATALOG HOLDS — THE THREE NUMBERS `/learn`'s HERO PRINTS.
 *
 * Scott, 2026-08-24: *"I want you to add 3 cards. Learning paths, courses,
 * lessons."* (`P1-J0-E291`)
 *
 * ── ⚠ WHY THIS FILE EXISTS INSTEAD OF THREE LITERALS IN THE COMPONENT ────────
 *
 * Three shipped decisions collide on these numbers, and this module is the only
 * shape that satisfies all three. It is not a tidy-up.
 *
 *   1. `brief_learn_walk2` says HARDCODE them, with the date measured and the
 *      query. A live query in a hero buys nothing.
 *   2. ⚠ `check:learn` GUARD 3 forbids a catalog total appearing as a LITERAL
 *      anywhere under `src/components/learn/`. It fired on the first cut of this
 *      work — correctly. Its positive form, GUARD 3b, says totals reach the UI
 *      from a query result.
 *   3. ⚠ `E223`, recorded in `app/learn/page.tsx`: signed out, `/learn` is a
 *      SALES PAGE and *"a visitor never sees a catalog query."*
 *
 * (2) and (3) point opposite ways: the guard wants a query, the route forbids one
 * on this surface. GUARD 3's SCOPE is the resolution — it was deliberately
 * written to watch `src/components/learn/`, because that is where a stale total
 * masquerades as live UI. The signed-in dashboard still derives its totals from
 * the tree it read (GUARD 3b, `learn-dashboard.ts`); nothing about that changed.
 *
 * ⚠ SO THE LITERALS LIVE HERE, IN ONE NAMED PLACE, WITH THEIR PROVENANCE
 * ATTACHED — and `check:learn` gained a NEW guard (GUARD 3c) asserting exactly
 * that: this module carries a `MEASURED_ON` date and the component imports from
 * it rather than inlining digits. GUARD 3 itself was not touched, widened or
 * weakened. ⚠ DO NOT "SIMPLIFY" THIS BY MOVING THE NUMBERS BACK INTO THE JSX.
 *
 * ── ⚠ MEASURED LIVE. NEVER FROM A SEED ──────────────────────────────────────
 *
 * `chat_kickoff.md`: a fact about content may ONLY be stated from a live DB read.
 * These came from the production database on the date below, by exactly:
 *
 *     await prisma.learningPath.count()   ->  23
 *     await prisma.course.count()         ->  54
 *     await prisma.lesson.count()         -> 522
 *
 * ⚠ THE COURSE TOTAL HAD NEVER BEEN MEASURED BEFORE THIS. The only course figures
 * anywhere in the repo were per-path samples (`spine-shots.tsx:140` — Advanced
 * Procurement 6, Contract Management 3). 54 is the first real number.
 *
 * ⚠ AND IT IS CONCENTRATED, WHICH SCOTT SHOULD KNOW BEFORE APPROVING IT AS COPY.
 * Courses per path, descending:
 *
 *     [9, 6, 6, 5, 4, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
 *
 * FIFTEEN of the 23 paths hold exactly ONE course; eight paths hold 39 of the 54.
 * The total is true and the distribution is thin. Every path has at least one
 * course and every course at least one lesson, so no card hides a zero.
 *
 * ⚠ NO CERTIFICATION OR "CERTIFIED LEARNERS" COUNT, AND THAT IS NOT AN OMISSION.
 * `P1-J3-E030`: 0 of 23 paths have a published test, so any such figure is 0 or a
 * lie. Scott did not ask for one; do not add one.
 *
 * ⚠ WHY NOT `ProofStats`: its own header says *"EVERY FIGURE HERE IS INVENTED"* —
 * 942, 10M+, $6M+ are placeholders awaiting counsel review. THESE ARE LIVE DB
 * READS. One component for both would put measured facts and unreviewed claims
 * behind the same door.
 */

/*
  ── ⚠⚠⚠ THE LITERALS ARE RETIRED — EVERY COUNT IS COMPUTED (`E606` R4) ────

  ⚠ SCOTT, 2026-09-23: *"No catalogue count is a literal. Retire
  `CATALOG_COUNTS` entirely. Every count is computed, and every count states
  what it counts — a number with no definition is how one page says 12 and
  another says 23 about the same catalogue."*

  ⚠⚠ THAT IS EXACTLY WHAT HAD HAPPENED. `/learn`'s public hero printed
  **23 · 54 · 522** from the literals below, while `/learn/paths` printed
  **12 paths · 305 lessons** and the signed-in dashboard used **12 · 39 · 305**
  as its denominators — including *"0 of 12 Certificates Awarded"*, where 12 is
  a PATH count wearing a certificate label. ⚠⚠⚠ ALL OF THOSE NUMBERS WERE TRUE.
  None of them said what it counted.

  ── ⚠⚠ ONE DEFINITION, NAMED ON SCREEN ───────────────────────────────────

  ⚠ **"Published paths a member can start"** — a `PUBLISHED` path holding at
  least one PLAYABLE lesson. ⚠⚠ `isPlayable` IS `lib/learn.ts`'s, IMPORTED NOT
  REWRITTEN: a vimeo ref plus a production status on the playable list. **A
  second copy of that rule is how the two numbers diverged in the first place.**
  ⚠ Courses and lessons are counted INSIDE those paths, on the same filter, so
  the three figures describe one catalogue rather than three.

  ⚠⚠ SUPERSEDED, quoted not deleted (`E164`) — and note the decision it
  carried: *"a visitor never sees a catalog query"* (`E223`). **R4 overrides it
  by rule 13**, and the cost is one cached query on a page that already awaits
  the session, so it was never static. ⚠ Reported rather than assumed away.
//   /** ⚠ THE DATE THE THREE BELOW WERE READ FROM THE LIVE DB. Bump it when you re-read. * /
//   export const CATALOG_COUNTS_MEASURED_ON = "2026-08-24";
//   
//   export type CatalogCount = { value: string; label: string };
//   
//   export const CATALOG_COUNTS: CatalogCount[] = [
//     { value: "23", label: "Learning Paths" },
//     { value: "54", label: "Courses" },
//     { value: "522", label: "Lessons" },
//   ];
*/

import { prisma } from "@/lib/prisma";
import { isPlayable } from "@/lib/learn";

export type CatalogCount = { value: string; label: string };

/**
 * ⚠⚠ THE LABEL CARRIES THE DEFINITION. *"Learning Paths"* is what produced the
 * disagreement; *"Paths You Can Start"* cannot be read as anything else.
 * ⚠ The counts are computed from one query and one filter, so they cannot
 * disagree with each other even if the catalogue changes mid-render.
 */
export async function getCatalogCounts(): Promise<CatalogCount[]> {
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      courses: {
        select: {
          id: true,
          sections: {
            select: { lessons: { select: { vimeo_ref: true, production_status: true } } },
          },
        },
      },
    },
  });

  let startablePaths = 0;
  let courses = 0;
  let lessons = 0;
  for (const p of paths) {
    const all = p.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const playable = all.filter(isPlayable).length;
    /* ⚠ A path with no playable lesson is not one a member can start, so it
       contributes NOTHING — not its courses and not its lessons. */
    if (playable === 0) continue;
    startablePaths++;
    lessons += playable;
    courses += p.courses.filter((c) =>
      c.sections.some((s) => s.lessons.some(isPlayable))
    ).length;
  }

  return [
    { value: String(startablePaths), label: "Paths You Can Start" },
    { value: String(courses), label: "Courses With Video" },
    { value: String(lessons), label: "Lessons You Can Watch" },
  ];
}
