import { prisma } from "@/lib/prisma";
import {
  countThreadsWaitingOn,
  listThreadsWaitingOn,
  pathForumAccess,
} from "@/lib/forums";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠⚠ THE GROUPS PAGE'S ONE READ (`P2-A3-E619` WS-A) ───────────────────
 *
 * ⚠ SCOTT, 2026-09-22: *"The Groups page is meh, zzzzzzz."* — the page is
 * REPLACED, not restyled, and the replacement is built on counted figures.
 *
 * ── ⚠⚠⚠ EVERY FIGURE HERE IS COUNTED, AND THE MOCKUP IS NOT A DATA SOURCE ─
 *
 * ⚠⚠ `decisions_2026-09-23` §7: *"A MOCKUP IS A LAYOUT, NOT A DATA SOURCE.
 * Where a mockup and a query disagree, the QUERY WINS."* ⚠ The mockup draws
 * groups with **34 / 21 / 18 / 12 members** and a header reading *"20 groups"*.
 * ⚠⚠⚠ MEASURED AGAINST THE DATABASE 2026-09-24, AND ALL FOUR ARE ILLUSTRATION:
 *
 * | figure | mockup | ⚠ measured |
 * |---|---|---|
 * | groups | 20 | **27** (23 path-backed + 4 general) |
 * | threads / posts | none | **0 / 0** — *"nothing posted"* is correct |
 * | `GroupMembership` rows, WHOLE TABLE | 34+21+18+12… | ⚠⚠ **1** |
 * | `LearnEnrollment` rows, WHOLE TABLE | — | ⚠⚠ **1** |
 *
 * ⚠⚠ THE TWO ONES ARE THE SAME ONE, AND THAT IS WHY NOTHING IS MISSING HERE:
 * the `E612` backfill writes one membership per enrolment, so 1 enrolment → 1
 * membership is the backfill AGREEING, not a backfill that never ran. ⚠ It was
 * checked precisely because a near-empty join table is what a failed backfill
 * looks like from the outside.
 *
 * ── ⚠⚠ SO THIS PAGE IS AN HONEST-ZEROS PAGE, BY MEASUREMENT ──────────────
 *
 * ⚠ `decisions_2026-09-23` §4: *"AT GENUINE ZERO, NAME THE FIRST MOVE RATHER
 * THAN REPORTING EMPTINESS — and the credit is A COUNT, NEVER A COMPLIMENT."*
 * ⚠⚠ A measured `0` renders as `0`, in ink (§2). **Nothing here returns a dash**,
 * because every figure below HAS a writer and is therefore countable:
 * `GroupMembership` (`joinGroup` + the backfill), `ForumThread` / `ForumPost`
 * (the composer), `ForumBoard.host_person_id` (the `E572` backfill).
 *
 * ── ⚠⚠⚠ WHAT IS DELIBERATELY ABSENT, AND WHY — THE WRITER TEST ───────────
 *
 * ⚠⚠ **NO PAID FIGURE IS RETURNED.** `price_cents` exists on the model and
 * **nothing writes it — 0 of 27 boards carry a price.** ⚠⚠⚠ Worse, no `Payment`
 * row is created anywhere in the codebase and `PAID` is never written, so a
 * price could not be collected even if one were set. ⚠ `decisions_2026-09-23`
 * §1: *"A FIGURE IS COUNTABLE WHEN THE STATE IT COUNTS HAS A WRITER."* The page
 * states the SETUP STATE in words instead, and offers no purchase.
 *
 * ⚠⚠ **NO REQUEST / PENDING FIGURE IS RETURNED EITHER.** `GroupType.REQUEST`
 * and `GroupMemberState.PENDING` exist, and **nothing writes a board's `type`**
 * — measured, all 27 boards are `OPEN` — so a *"people asking to join"* count
 * would be a figure over a state the product cannot reach. ⚠ That chain is
 * WS-B's, and it is built there rather than counted here.
 */

/** One circle in the picture. ⚠ `quiet` is a POST count of zero, not a guess. */
export type GroupCircle = {
  slug: string;
  title: string;
  members: number;
  posts: number;
  /** ⚠⚠ DASHED WHILE QUIET, SOLID ONCE POSTED — the brief's own rule, and it is
      derived from `posts`, never stored, so the two can never disagree. */
  quiet: boolean;
};

export type GroupCard = {
  slug: string;
  title: string;
  /** ⚠ What the VIEWER is to this group, in the viewer's own words. */
  role: "You Run It" | "Member";
  /** ⚠⚠ `Path group` or a member-started one — it is what explains the door. */
  pathBacked: boolean;
  members: number;
  posts: number;
  /** ⚠ Null when nothing has ever been posted — the caller prints "no posts
      yet" rather than a date that would have to be invented. */
  lastActivity: Date | null;
};

export type GroupsHome = {
  circles: GroupCircle[];
  /** The three counted figures in the header's right half. */
  runCount: number;
  questionsWaiting: number;
  joinedCount: number;
  /** ⚠ Unanswered questions in groups you run, OLDEST FIRST. Empty today. */
  needsYou: {
    id: string;
    title: string;
    boardSlug: string;
    boardTitle: string;
    askedAt: Date;
  }[];
  run: GroupCard[];
  joined: GroupCard[];
  thisMonth: { asked: number; answered: number; newMembers: number };
  /** ⚠⚠ A group the viewer may post a starter question in, or null. The BUTTON
      IS NOT RENDERED WHEN THIS IS NULL — `E579`: a control whose handler
      refuses is a door onto a wall. */
  starterSlug: string | null;
};

/** ⚠ Quietest first — the brief's sort, and it is the SORT THAT HELPS: a group
    nobody has posted in is the one that needs its owner. Ties break on the
    smaller room, then by title so the order is stable between renders. */
function quietestFirst(a: GroupCard, b: GroupCard): number {
  if (a.posts !== b.posts) return a.posts - b.posts;
  if (a.members !== b.members) return a.members - b.members;
  return a.title.localeCompare(b.title);
}

export async function getGroupsHome(viewer: Viewer): Promise<GroupsHome> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  /*
    ⚠⚠⚠ THE ACCESS RULE IS CALLED, NOT RESTATED. `pathForumAccess` is the one
    predicate for "which path groups are mine", and `getForumsHome` already
    calls it. ⚠ Writing the two conditions out again here is exactly the shape
    that produced the `E610` defect in this same file — and the rate leak fixed
    hours ago in `E618`. ⚠⚠ ONE CONCEPT, ONE PLACE (`E585`).
  */
  const access = await pathForumAccess(viewer);
  const myPathIds = [...new Set([...access.enrolled, ...access.taught])];

  /* ⚠ The four general boards have a NULL path and belong to everybody, so
     they are part of "my groups" for every signed-in member. */
  const boards = await prisma.forumBoard.findMany({
    where: {
      OR: [{ learning_path_id: null }, { learning_path_id: { in: myPathIds } }],
    },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      learning_path_id: true,
      host_person_id: true,
      _count: {
        select: {
          threads: true,
          /* ⚠⚠ ACTIVE ONLY. A `REMOVED` row is history, not a member, and
             counting it would inflate every room the moment anybody leaves. */
          members: { where: { state: "ACTIVE" } },
        },
      },
      threads: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: { created_at: true },
      },
    },
  });

  const card = (b: (typeof boards)[number], role: GroupCard["role"]): GroupCard => ({
    slug: b.slug,
    title: b.title,
    role,
    pathBacked: b.learning_path_id !== null,
    members: b._count.members,
    posts: b._count.threads,
    lastActivity: b.threads[0]?.created_at ?? null,
  });

  /* ⚠⚠ OWNERSHIP IS THE COLUMN, NOT THE CAPABILITY (`E572`). "You run it" means
     `host_person_id` is you — it does NOT mean you teach the path. Collapsing
     the two is the `E558` lockout in reverse: Scott teaches 16 paths and hosts
     13, and a page telling him he runs 16 would be wrong about three of them. */
  const runBoards = person
    ? boards.filter((b) => b.host_person_id === person.id)
    : [];
  const runSlugs = new Set(runBoards.map((b) => b.slug));

  /* ⚠ A membership row you hold on a group you do NOT run. Running it is a
     stronger statement than joining it, so a board never appears twice. */
  const myMemberships = person
    ? await prisma.groupMembership.findMany({
        where: { person_id: person.id, state: "ACTIVE" },
        select: { board_id: true },
      })
    : [];
  const joinedBoardIds = new Set(myMemberships.map((m) => m.board_id));
  const joinedBoards = boards.filter(
    (b) => joinedBoardIds.has(b.id) && !runSlugs.has(b.slug)
  );

  /* ⚠⚠ THE PICTURE IS THE SAME SET THE PAGE LISTS. A circle for a group the
     page does not show would be a figure nobody can click through to. */
  const circles: GroupCircle[] = boards.map((b) => ({
    slug: b.slug,
    title: b.title,
    members: b._count.members,
    posts: b._count.threads,
    quiet: b._count.threads === 0,
  }));

  /*
    ⚠⚠ QUESTIONS WAITING IS `countThreadsWaitingOn`, AND IT IS NOT REIMPLEMENTED.
    ⚠ It lives in `forums.ts` because `check:community` GUARD 2 requires that
    `marked_helpful_*` be touched in exactly one file — and that guard was right
    when it pushed the query out of `statistics.ts`. ⚠⚠ Its scope here is the
    paths of the groups you RUN, which is the question the figure answers:
    *"what is waiting on ME."*
  */
  const runPathIds = runBoards
    .map((b) => b.learning_path_id)
    .filter((id): id is string => id !== null);
  const questionsWaiting = person
    ? await countThreadsWaitingOn(person.id, runPathIds)
    : 0;

  /*
    ⚠⚠⚠ THE QUERY IS `forums.ts`'s, NOT THIS FILE'S, AND A GATE SAID SO.
    ⚠ It was written here first and `check:community` GUARD 2 went RED —
    *"`marked_helpful_*` is written in exactly one file"* — naming this module
    beside `forums.ts`. ⚠⚠ THAT IS THE SECOND TIME THAT GUARD HAS CAUGHT THIS
    EXACT MISTAKE: `countThreadsWaitingOn` was moved out of `statistics.ts` for
    it. ⚠⚠⚠ THE FIX IS TO MOVE THE QUERY, NOT TO EXEMPT THE FILE.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const needsYouRows = await prisma.forumThread.findMany({
    //     where: { board_id: { in: … },
    //       AND: [{ posts: { none: { author_id: person.id } } },
    //             { posts: { none: { marked_helpful_at: { not: null } } } }] },
    //     orderBy: { created_at: "asc" }, take: 5, … });
  */
  const needsYou = person
    ? await listThreadsWaitingOn(person.id, runBoards.map((b) => b.id))
    : [];

  /*
    ── ⚠⚠ THIS MONTH — THREE COUNTS, ONE WINDOW ────────────────────────────
    ⚠ The window is the calendar month, because that is what the card's own
    title claims. ⚠⚠ It is computed ONCE and shared, so the three figures
    cannot be measured against three slightly different "now"s.
  */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [asked, answered, newMembers] = person
    ? await Promise.all([
        /* ⚠ Questions YOU asked, anywhere you can post. */
        prisma.forumThread.count({
          where: { author_id: person.id, created_at: { gte: monthStart } },
        }),
        /* ⚠⚠ Replies you wrote — a POST, not a thread, or starting a question
           would count as answering it. */
        prisma.forumPost.count({
          where: { author_id: person.id, created_at: { gte: monthStart } },
        }),
        /* ⚠ People who joined a group YOU RUN this month. Zero when you run
           nothing, which is a real zero and prints as one. */
        runBoards.length
          ? prisma.groupMembership.count({
              where: {
                board_id: { in: runBoards.map((b) => b.id) },
                state: "ACTIVE",
                created_at: { gte: monthStart },
              },
            })
          : Promise.resolve(0),
      ])
    : [0, 0, 0];

  /* ⚠⚠⚠ THE BUTTON'S TARGET, RESOLVED HERE RATHER THAN GUESSED IN THE VIEW.
     A group you run is a group you can certainly post in. ⚠ Null when you run
     none — and the caller then does not render the control at all (`E579`). */
  const starterSlug = runBoards.length
    ? [...runBoards].sort((a, b) => a._count.threads - b._count.threads)[0].slug
    : null;

  return {
    circles,
    runCount: runBoards.length,
    questionsWaiting,
    joinedCount: joinedBoards.length,
    needsYou,
    run: runBoards.map((b) => card(b, "You Run It")).sort(quietestFirst),
    joined: joinedBoards.map((b) => card(b, "Member")).sort(quietestFirst),
    thisMonth: { asked, answered, newMembers },
    starterSlug,
  };
}
