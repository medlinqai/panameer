/*
  ── ⚠⚠ RULING 1: THE WORD IS "GROUPS" (`P2-A3-E619` WS-C) ────────────────
  ⚠ SCOTT, 2026-09-22: *"The word is Groups everywhere. **Forum** and **Room**
  disappear from the interface** — the menu, the page, the headings, the
  buttons and the empty states."* ⚠⚠ DATA AND TABLE NAMES STAY (`ForumBoard`,
  `forum_boards`, `forums.ts`); only the words people READ change.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   const track = … : "Panameer Rooms";
*/
import { prisma } from "@/lib/prisma";
import {
  countThreadsWaitingOn,
  listThreadsWaitingOn,
  pathForumAccess,
} from "@/lib/forums";
import { groupOffer, type GroupOffer } from "@/lib/group-membership";
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

/** A group you are not in, as Discover shows it. */
export type DiscoverGroup = {
  /** ⚠⚠ THE BOARD ID, because Discover reuses `GroupJoin` — the ONE join
      control — and that control posts a `boardId`. A second join button here
      would be a second predicate, which is the shape that leaked eight rates
      on `/explore` the same day (`E618`). */
  boardId: string;
  slug: string;
  title: string;
  members: number;
  posts: number;
  /** ⚠ `groupOffer`'s verdict — never re-derived here. */
  offer: GroupOffer;
  /** ⚠⚠ The path's own slug, so `by_enrolment` can send them to the door that
      actually opens rather than to a Join button that refuses. */
  pathSlug: string | null;
};

export type DiscoverTrack = { track: string; groups: DiscoverGroup[] };

/**
 * ── ⚠⚠⚠ DISCOVER — GROUPS YOU ARE NOT IN (`P2-A3-E619` WS-B 1) ──────────
 *
 * ⚠ THE BRIEF: *"groups you're not in, **grouped by track**, each with member
 * count and Join; a group you're already in says so and opens instead."*
 *
 * ── ⚠⚠ THE TRACK IS `LearningPath.group`, AND IT WAS MEASURED ───────────
 *
 * ⚠ The mockup's track headings are *"Procurement"* and *"Payables & Finance"*.
 * ⚠⚠ MEASURED 2026-09-24: `LearningPath.group` holds exactly that kind of
 * value — **Procurement 7 · Foundational Learning Paths 3 · Core HR 2 · Supply
 * Chain Execution 2**, and six more with one each. ⚠ So the grouping is a real
 * column, not a shape invented to match a picture.
 *
 * ⚠⚠⚠ THREE PATH GROUPS HAVE A **NULL** TRACK, AND THEY ARE NOT SWEPT IN WITH
 * THE GENERAL ROOMS. A path-backed group whose path has no `group` is still a
 * path group — filing it under *"Panameer"* would tell a member the wrong thing
 * about how its door works. ⚠ It gets its own honest heading instead.
 *
 * ── ⚠⚠ WHAT IT DOES NOT DO ──────────────────────────────────────────────
 *
 * ⚠⚠⚠ **NO PAID SECTION.** The brief: *"Paid groups appear with their price and
 * who leads them — **only if premise 4 finds real ones**, otherwise leave the
 * section out and report."* ⚠ MEASURED: **0 of 27 boards carry a price**, so
 * the section is left out, as instructed. `groupOffer` still returns `priced`
 * if one ever appears, and the page renders that group's refusal honestly.
 */
export async function getDiscoverGroups(viewer: Viewer): Promise<DiscoverTrack[]> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  /* ⚠ Every board, because Discover's whole job is showing what you have NOT
     found yet — the access rule decides what you can OPEN, not what exists. */
  const boards = await prisma.forumBoard.findMany({
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      price_cents: true,
      price_period: true,
      learning_path_id: true,
      host_person_id: true,
      learningPath: { select: { slug: true, group: true } },
      _count: {
        select: { threads: true, members: { where: { state: "ACTIVE" } } },
      },
    },
  });

  /* ⚠⚠ "IN IT" IS MEMBERSHIP **OR** OWNERSHIP. A founder is not shown their own
     group as something to discover. */
  const mine = person
    ? new Set(
        (
          await prisma.groupMembership.findMany({
            where: { person_id: person.id, state: "ACTIVE" },
            select: { board_id: true },
          })
        ).map((m) => m.board_id)
      )
    : new Set<string>();

  const out = new Map<string, DiscoverGroup[]>();
  for (const b of boards) {
    const isMine = mine.has(b.id) || (person != null && b.host_person_id === person.id);
    if (isMine) continue;

    /*
      ⚠⚠⚠ THE OFFER COMES FROM `groupOffer`, WHICH IS THE ONE RULE. Discover
      must not decide for itself what a group offers — that is the second
      predicate that leaked eight rates on `/explore` this same day (`E618`).
      ⚠ `isMember` is FALSE here by construction: everything still in this loop
      is a group the viewer is not in.
    */
    const offer = groupOffer(b, false);

    /* ⚠ A path group with no `group` value is still a PATH group. */
    const track = b.learning_path_id
      ? (b.learningPath?.group ?? "Learning Paths")
      : "Panameer Groups";

    if (!out.has(track)) out.set(track, []);
    out.get(track)!.push({
      boardId: b.id,
      slug: b.slug,
      title: b.title,
      members: b._count.members,
      posts: b._count.threads,
      offer,
      pathSlug: b.learningPath?.slug ?? null,
    });
  }

  /* ⚠ Biggest track first, then alphabetical — a stable order that puts the
     fullest shelf at eye level. Ties break on name so renders do not shuffle. */
  return [...out.entries()]
    .map(([track, groups]) => ({ track, groups }))
    .sort((a, b) => b.groups.length - a.groups.length || a.track.localeCompare(b.track));
}

export type JoinRequestRow = {
  /** ⚠ The MEMBERSHIP row's id — that is what a decision acts on. */
  id: string;
  groupSlug: string;
  groupTitle: string;
  personName: string;
  askedAt: Date;
};

export type MyRequestRow = {
  groupSlug: string;
  groupTitle: string;
  state: "PENDING" | "DECLINED";
  askedAt: Date;
  decidedAt: Date | null;
};

/**
 * ── ⚠⚠⚠ REQUESTS — BOTH DIRECTIONS (`P2-A3-E619` WS-B 3) ────────────────
 *
 * ⚠ THE BRIEF: *"people asking to join groups you run (approve or decline, and
 * they're told either way), **and the groups you're waiting on**."*
 *
 * ⚠⚠ MEASURED AT THE PREMISE CHECK AND STILL TRUE OF EXISTING DATA: every one
 * of the 27 boards that existed before this brief is `OPEN`, so **there were
 * zero `PENDING` rows and no way to make one.** ⚠⚠⚠ THIS LIST IS NOT EMPTY
 * BECAUSE NOBODY HAS ASKED — IT WAS EMPTY BECAUSE NOTHING COULD ASK. `E619`
 * WS-B is what makes a `REQUEST` group creatable and a `PENDING` row
 * answerable, so from here the emptiness is an honest *"nobody yet"*.
 *
 * ⚠ DECLINED ROWS ARE RETURNED TO THE ASKER, NOT HIDDEN. A decline the member
 * cannot see reads as *"you never asked"*, and they ask again forever.
 */
export async function getGroupRequests(
  viewer: Viewer
): Promise<{ incoming: JoinRequestRow[]; mine: MyRequestRow[] }> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return { incoming: [], mine: [] };

  const [incoming, mine] = await Promise.all([
    /* ⚠⚠ SCOPED TO BOARDS THIS PERSON HOSTS — the same predicate
       `decideJoinRequest` enforces on the write, so the list cannot offer a
       decision the writer would refuse. */
    prisma.groupMembership.findMany({
      where: { state: "PENDING", board: { host_person_id: person.id } },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        created_at: true,
        board: { select: { slug: true, title: true } },
        person: { select: { first_name: true, last_name: true } },
      },
    }),
    prisma.groupMembership.findMany({
      where: { person_id: person.id, state: { in: ["PENDING", "DECLINED"] } },
      orderBy: { created_at: "desc" },
      select: {
        created_at: true,
        decided_at: true,
        state: true,
        board: { select: { slug: true, title: true } },
      },
    }),
  ]);

  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      groupSlug: r.board.slug,
      groupTitle: r.board.title,
      /* ⚠ A name, not an id. `E564` — no demo data, and no bare uuid either. */
      personName: [r.person.first_name, r.person.last_name].filter(Boolean).join(" ") || "A member",
      askedAt: r.created_at,
    })),
    mine: mine.map((r) => ({
      groupSlug: r.board.slug,
      groupTitle: r.board.title,
      state: r.state as "PENDING" | "DECLINED",
      askedAt: r.created_at,
      decidedAt: r.decided_at,
    })),
  };
}

/**
 * How many join requests are waiting on YOU — the badge on the Requests tab.
 *
 * ⚠⚠ A COUNT, NOT THE ROWS. It is read on every view so the tab can carry it,
 * and loading the full list three views out of three to render one number would
 * be the waste the per-view reads exist to avoid.
 * ⚠ SCOPED TO BOARDS YOU HOST — the same predicate `getGroupRequests` and
 * `decideJoinRequest` use, so the badge can never promise a decision the writer
 * would refuse.
 */
export async function countPendingForOwner(viewer: Viewer): Promise<number> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return 0;
  return prisma.groupMembership.count({
    where: { state: "PENDING", board: { host_person_id: person.id } },
  });
}
