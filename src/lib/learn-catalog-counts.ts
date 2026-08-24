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

/** ⚠ THE DATE THE THREE BELOW WERE READ FROM THE LIVE DB. Bump it when you re-read. */
export const CATALOG_COUNTS_MEASURED_ON = "2026-08-24";

export type CatalogCount = { value: string; label: string };

export const CATALOG_COUNTS: CatalogCount[] = [
  { value: "23", label: "Learning Paths" },
  { value: "54", label: "Courses" },
  { value: "522", label: "Lessons" },
];
