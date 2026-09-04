import { prisma } from "@/lib/prisma";
/* ⚠ `P1-J3-E383` — ONE instructor predicate, extracted rather than copied. */
import { teachesPathWhere } from "@/lib/learn-home";
import type { Viewer } from "@/lib/access";
import {
  communityIdentityGapsForPerson,
  type CommunityGap,
} from "@/lib/community-identity";

/**
 * Forums (PHASE 2 / WS2-C) — board list → threads → posts.
 *
 * REAL, not a scaffold: three Prisma models, real reads, real writes. A forum
 * with a fake post list is worse than no forum, and the models are small enough
 * that stubbing them would have cost more explanation than building them.
 *
 * AUTHORSHIP IS RESOLVED FROM THE SESSION, never from the request. Every write
 * here takes a `Viewer` and looks up that viewer's own Person; nothing accepts
 * an author id, so there is no shape of request that posts as somebody else.
 */

export class ForumError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "INVALID"
      /* ⚠ `P1-ALL-E033`. Distinct from INVALID because the fix is not in the
         composer — it is on the profile — and the UI has to tell the two apart
         to link correctly. */
      | "IDENTITY_REQUIRED"
      /* ⚠ `P1-J3-E383`. A PATH FORUM IS CLOSED — enrolled learners and the
         people who teach it. Distinct from the three above because the fix is
         neither the composer nor the profile: it is enrolling. */
      | "NOT_ENROLLED",
    /** Populated for IDENTITY_REQUIRED: the named fields, with their links. */
    public fields?: CommunityGap[]
  ) {
    super(message);
    this.name = "ForumError";
  }
}

/**
 * ⚠⚠ THE WRITE GATE (`P1-ALL-E033`) — name · photo · job title.
 *
 * **SCOTT:** *"That isn't vetting, it's non-anonymity."* Shit-posting collapses
 * when your face and your job are attached to it.
 *
 * ⚠ THE LIB IS THE BOUNDARY. The composer mirrors this and explains itself
 * before anyone types a paragraph, but `/api/community/forums` is reachable
 * directly and a gate that lives only in the client is not a gate.
 *
 * ⚠⚠ CALLED FROM `createThread` AND `createPost` AND FROM NOWHERE ELSE. Not from
 * any read, not from `markHelpful` — `check:community-identity` fails the build
 * if it appears on either. Reading stays open, signed out included, and marking
 * an answer helpful is a reader's act.
 */
async function requireIdentity(personId: string): Promise<void> {
  const gaps = await communityIdentityGapsForPerson(personId);
  if (gaps.length === 0) return;
  throw new ForumError(
    gaps.map((g) => `${g.field} — ${g.reason}`).join(" "),
    "IDENTITY_REQUIRED",
    gaps
  );
}

/**
 * THE BOARDS ARE SEEDED, NOT USER-CREATED.
 *
 * A forum whose sections anyone can add fragments before it has enough people
 * to fill the first four. These four map to what this marketplace is actually
 * about — the work, the tooling, getting started, and the business of being a
 * provider — rather than to a generic template.
 *
 * `ensureBoards` is idempotent by slug, so it can run on every board-list read
 * without a migration step or a seed command somebody has to remember.
 */
const SEED_BOARDS = [
  {
    slug: "implementation",
    title: "Implementation & Configuration",
    description:
      "Setup, config and the things that only bite you on a real project.",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Something's broken and the documentation doesn't cover it.",
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "New to Oracle Cloud or new to consulting — ask the question you think is too basic.",
  },
  {
    slug: "the-business",
    title: "The Business of Consulting",
    description:
      "Rates, scoping, clients, contracts, and staying busy without burning out.",
  },
];

async function ensureBoards() {
  for (const [i, b] of SEED_BOARDS.entries()) {
    await prisma.forumBoard.upsert({
      where: { slug: b.slug },
      update: { title: b.title, description: b.description, sort_order: i * 10 },
      create: { ...b, sort_order: i * 10 },
    });
  }
}

/** Resolve the viewer's own Person. Fails closed. */
async function ownPerson(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) throw new ForumError("No person for this account", "NOT_FOUND");
  return person;
}

const authorSelect = {
  id: true,
  first_name: true,
  last_name: true,
  photo_url: true,
  title: true,
} as const;

function authorView(a: {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  title: string | null;
}) {
  return {
    id: a.id,
    name: `${a.first_name} ${a.last_name}`.trim(),
    firstName: a.first_name,
    lastName: a.last_name,
    photoUrl: a.photo_url,
    title: a.title,
  };
}

/** The board list, with live thread counts. */
export async function listBoards() {
  await ensureBoards();
  const boards = await prisma.forumBoard.findMany({
    /*
      ⚠⚠ THE FOUR GENERAL BOARDS ONLY (`P1-J3-E383`). Path boards live on their
      path page and are DELIBERATELY absent here.

      Listing them beside the four would make this page twelve mostly-empty
      rooms sitting next to four that have a chance of filling — the exact
      fragmentation this file's own docblock warns about, and it would damage
      the four that already work. ⚠ `check:forums` asserts this list is the
      four seed slugs and nothing else.
    */
    where: { learning_path_id: null },
    orderBy: { sort_order: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      _count: { select: { threads: true } },
      threads: {
        orderBy: { last_post_at: "desc" },
        take: 1,
        select: { title: true, last_post_at: true },
      },
    },
  });
  return boards.map((b) => ({
    slug: b.slug,
    title: b.title,
    description: b.description,
    threadCount: b._count.threads,
    latest: b.threads[0]
      ? { title: b.threads[0].title, at: b.threads[0].last_post_at.toISOString() }
      : null,
  }));
}

/** One board and its threads, newest activity first. */
/**
 * ⚠⚠ TAKES A VIEWER AS OF `P1-J3-E383`, BECAUSE A PATH BOARD IS CLOSED.
 *
 * ⚠ THE FOUR GENERAL BOARDS ARE UNCHANGED — `viewer` is ignored for them, and
 * passing `null` still returns them exactly as before. Only a board with a
 * `learning_path_id` is gated.
 *
 * ⚠ IT RETURNS `null` FOR A BOARD THE VIEWER MAY NOT OPEN, not a partial board
 * and not an empty thread list. A page that renders a board with zero threads
 * cannot be told apart from a locked one by the reader, and "there is nothing
 * here" is a different and false statement.
 */
export async function getBoard(slug: string, viewer: Viewer | null = null) {
  await ensureBoards();
  const gate = await prisma.forumBoard.findUnique({
    where: { slug },
    select: { learning_path_id: true },
  });
  /* ⚠⚠ THE GATE RUNS BEFORE THE READ, so a closed board never assembles its
     thread titles at all — the same ordering `/providers/[id]` uses. A payload
     built and then discarded is one refactor away from being returned. */
  if (gate?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, gate.learning_path_id);
    if (!allowed) return null;
  }
  const board = await prisma.forumBoard.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      description: true,
      threads: {
        orderBy: { last_post_at: "desc" },
        select: {
          id: true,
          title: true,
          reply_count: true,
          last_post_at: true,
          created_at: true,
          author: { select: authorSelect },
        },
      },
    },
  });
  if (!board) return null;
  return {
    slug: board.slug,
    title: board.title,
    description: board.description,
    threads: board.threads.map((t) => ({
      id: t.id,
      title: t.title,
      replyCount: t.reply_count,
      lastPostAt: t.last_post_at.toISOString(),
      author: authorView(t.author),
    })),
  };
}

/**
 * One thread: the opening post plus every reply, oldest first.
 *
 * `viewerPersonId` is OPTIONAL and read-only — it decides `canMarkHelpful` per
 * reply, which is a rendering hint and nothing more. ⚠ THE PERMISSION IS NOT
 * HERE: `markHelpful` re-checks it from the session on every write, because a
 * hidden button is not a permission.
 */
/**
 * ⚠ `viewer` ADDED BY `P1-J3-E383`. A thread inside a PATH board is as closed as
 * the board itself — reaching it by its own id must not be a way around the
 * door. ⚠ The four general boards are unaffected and `null` behaves exactly as
 * before.
 */
export async function getThread(
  id: string,
  viewerPersonId?: string | null,
  viewer: Viewer | null = null
) {
  /* ⚠⚠ THE GATE BEFORE THE READ. A deep link to a thread id is the obvious hole
     in a closed room, and it is the one a URL guesser finds first. */
  const gate = await prisma.forumThread.findUnique({
    where: { id },
    select: { board: { select: { learning_path_id: true } } },
  });
  if (gate?.board?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, gate.board.learning_path_id);
    if (!allowed) return null;
  }
  const thread = await prisma.forumThread.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      created_at: true,
      author: { select: authorSelect },
      board: { select: { slug: true, title: true } },
      posts: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          body: true,
          created_at: true,
          marked_helpful_at: true,
          author: { select: authorSelect },
        },
      },
    },
  });
  if (!thread) return null;

  /* Only the person who ASKED can say whether an answer answered. */
  const viewerIsThreadAuthor =
    Boolean(viewerPersonId) && thread.author.id === viewerPersonId;

  return {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    createdAt: thread.created_at.toISOString(),
    author: authorView(thread.author),
    board: thread.board,
    viewerIsThreadAuthor,
    posts: thread.posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at.toISOString(),
      author: authorView(p.author),
      markedHelpfulAt: p.marked_helpful_at ? p.marked_helpful_at.toISOString() : null,
      /* ⚠ AND NOT ON THEIR OWN REPLY. A thread author who also answers must not
         be able to mark themselves helpful — that is the one shape of this
         mechanic that would be farmable by a single account. */
      canMarkHelpful: viewerIsThreadAuthor && p.author.id !== viewerPersonId,
    })),
  };
}

/**
 * THE CREDIT HOOK POINT (PHASE 3).
 *
 * Called on every successful thread and reply. PHASE 3 replaces the body with a
 * `FORUM_POST` ledger entry, idempotent on `(personId, reason, refId)` — which
 * is why the refId is passed now rather than added later. A no-op today, and
 * deliberately a named function rather than a TODO comment: the call sites are
 * already correct, so PHASE 3 is one file's change and not a hunt through the
 * forum code for the places a post happens.
 */
async function awardForumPost(personId: string, refId: string): Promise<void> {
  void personId;
  void refId;
  // PHASE 3: postLedgerEntry({ personId, reason: "FORUM_POST", refId })
}

/** Start a thread. Author comes from the session; nothing else can set it. */
export async function createThread(
  viewer: Viewer,
  input: { boardSlug: string; title: string; body: string }
) {
  const person = await ownPerson(viewer);
  await requireIdentity(person.id);
  const board = await prisma.forumBoard.findUnique({
    where: { slug: input.boardSlug },
    select: { id: true, learning_path_id: true },
  });
  if (!board) throw new ForumError("That board doesn't exist.", "NOT_FOUND");
  /* ⚠⚠ A PATH FORUM IS CLOSED TO POSTING TOO (`P1-J3-E383`) — enrolled learners
     and the people who teach it. Re-checked HERE and not only where the
     composer is hidden: a hidden box is not a permission, and this path is
     reachable through the API route directly. */
  if (board.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, board.learning_path_id);
    if (!allowed) {
      throw new ForumError(
        "This forum is for people taking the path. Enroll to join the conversation.",
        "NOT_ENROLLED"
      );
    }
  }

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 5) {
    throw new ForumError("Give the question a title people can scan.", "INVALID");
  }
  if (body.length < 15) {
    throw new ForumError("Add a bit more detail so someone can answer.", "INVALID");
  }

  const thread = await prisma.forumThread.create({
    data: {
      board_id: board.id,
      author_id: person.id,
      title: title.slice(0, 200),
      body: body.slice(0, 8000),
      last_post_at: new Date(),
    },
    select: { id: true },
  });
  await awardForumPost(person.id, thread.id);
  return thread;
}

/** Reply to a thread. */
export async function createPost(
  viewer: Viewer,
  input: { threadId: string; body: string }
) {
  const person = await ownPerson(viewer);
  await requireIdentity(person.id);
  const body = input.body.trim();
  if (body.length < 2) throw new ForumError("Say something first.", "INVALID");

  const thread = await prisma.forumThread.findUnique({
    where: { id: input.threadId },
    select: { id: true, board: { select: { learning_path_id: true } } },
  });
  /* ⚠ SAME GATE, REACHED THROUGH THE THREAD'S BOARD. A reply is a post. */
  if (thread?.board?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, thread.board.learning_path_id);
    if (!allowed) {
      throw new ForumError(
        "This forum is for people taking the path. Enroll to join the conversation.",
        "NOT_ENROLLED"
      );
    }
  }
  if (!thread) throw new ForumError("That thread no longer exists.", "NOT_FOUND");

  /*
    The post and the thread's denormalised counters move together. Without the
    transaction a failed counter update leaves a board list that under-reports
    replies forever — the kind of drift nobody notices until they count by hand.
  */
  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.forumPost.create({
      data: {
        thread_id: thread.id,
        author_id: person.id,
        body: body.slice(0, 8000),
      },
      select: { id: true },
    });
    await tx.forumThread.update({
      where: { id: thread.id },
      data: { reply_count: { increment: 1 }, last_post_at: new Date() },
    });
    return created;
  });

  await awardForumPost(person.id, post.id);
  return post;
}

// ---------------------------------------------------------------------------
// "This answered my question" (brief_community_signal WS1)
// ---------------------------------------------------------------------------

/**
 * MARK A REPLY HELPFUL — the only involvement signal this product has.
 *
 * ── ⚠ TWO RULES, BOTH ENFORCED HERE AND NOWHERE ELSE ─────────────────────────
 *
 *   1  ONLY THE THREAD'S AUTHOR. The person who asked is the only one who knows
 *      whether an answer answered, and making it theirs alone is also what stops
 *      it being brigaded.
 *   2  NEVER YOUR OWN REPLY. A thread author who answers their own question must
 *      not be able to mark themselves helpful; that is the single shape of this
 *      mechanic a lone account could farm.
 *
 * ⚠ IT REFUSES, IT DOES NOT SILENTLY NO-OP. A click that appears to work and
 * changes nothing is worse than an error the UI can explain, and a no-op would
 * also make the API indistinguishable from a permission bug in testing.
 *
 * ⚠ THE ACTING PERSON COMES FROM THE SESSION, never from a body field — the same
 * rule every other write in this file and in `lib/company.ts` follows. There is
 * deliberately no `personId` parameter, so no request shape can mark on behalf
 * of somebody else.
 */
async function loadForMarking(viewer: Viewer, postId: string) {
  const person = await ownPerson(viewer);
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      author_id: true,
      marked_helpful_at: true,
      thread: { select: { id: true, author_id: true } },
    },
  });
  if (!post) throw new ForumError("That reply no longer exists.", "NOT_FOUND");

  if (post.thread.author_id !== person.id) {
    throw new ForumError(
      "Only the person who asked the question can mark an answer helpful.",
      "INVALID"
    );
  }
  if (post.author_id === person.id) {
    throw new ForumError("You can't mark your own reply helpful.", "INVALID");
  }
  return { person, post };
}

export async function markHelpful(viewer: Viewer, postId: string) {
  const { person, post } = await loadForMarking(viewer, postId);
  /* Idempotent: re-marking an already-marked reply is not an error, it just
     does not move the timestamp. Double-clicks happen. */
  if (post.marked_helpful_at) return { id: post.id, markedHelpfulAt: post.marked_helpful_at.toISOString() };

  const updated = await prisma.forumPost.update({
    where: { id: post.id },
    data: { marked_helpful_at: new Date(), marked_helpful_by: person.id },
    select: { id: true, marked_helpful_at: true },
  });
  return {
    id: updated.id,
    markedHelpfulAt: updated.marked_helpful_at ? updated.marked_helpful_at.toISOString() : null,
  };
}

/** Undo it. Same two rules — an author who mis-clicks has to be able to reverse. */
export async function unmarkHelpful(viewer: Viewer, postId: string) {
  const { post } = await loadForMarking(viewer, postId);
  await prisma.forumPost.update({
    where: { id: post.id },
    data: { marked_helpful_at: null, marked_helpful_by: null },
  });
  return { id: post.id, markedHelpfulAt: null };
}

/** The viewer's own Person id, for the read path's rendering hints. */
export async function viewerPersonId(viewer: Viewer): Promise<string | null> {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  return person?.id ?? null;
}


// ---------------------------------------------------------------------------
// ⚠⚠ PATH FORUMS (`P1-J3-E383`)
//
// SCOTT, 2026-09-04: *"every learning path should have a forum."*
// And: *"members need to be enrolled in the course or the instructor to have
// access to the LP forum."*
// And: *"everyone can see them, but only members enrolled in the LP can access
// them...marketing."*
//
// ⚠ VISIBILITY AND ACCESS ARE TWO DIFFERENT RULES AND ONLY ONE IS CLOSED:
//
//                            signed out   signed in, not enrolled   member
//   that a forum exists          yes                yes               yes
//   thread titles, posts         no                 no                yes
//   posting                      no                 no                yes
//
// ⚠⚠ THE ROOM IS ADVERTISED; THE DOOR IS LOCKED.
// ---------------------------------------------------------------------------

/**
 * ⚠⚠ MAY THIS VIEWER OPEN THIS PATH'S FORUM. Enrolment OR teaching.
 *
 * ── WHY IT IS CLOSED, WHICH IS NOT THE ARGUMENT I FIRST MADE ──────────────
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — the first draft of `E383` said *"Read is
 * open. Posting requires enrolment… a Q&A thread is worth more to somebody
 * deciding whether to take the path than a locked door is."*
 *
 * ⚠⚠ THAT WAS WRONG, AND THE REASON MATTERS: A LEARNER ASKING THE QUESTION THEY
 * THINK IS TOO BASIC, IN A ROOM THEY ASSUMED WAS PRIVATE, THAT TURNS OUT TO BE
 * PUBLICLY READABLE, IS A TRUST BREACH — and it is exactly the question this
 * forum exists to get. The `Getting Started` board's own description is *"ask
 * the question you think is too basic."* A closed room gets better questions
 * than an open one. ⚠ THE COST, ON THE RECORD: the "see the conversation before
 * you join" pitch is dead, and that is the trade.
 *
 * ⚠⚠ ENROLLING **IS** JOINING. There is no `BoardMember` model, no join button
 * and no approval queue — which is the answer to the question `E372` had to
 * leave open when it reported that board membership does not exist.
 *
 * ⚠⚠ THE INSTRUCTOR HALF USES `teachesPathWhere`, EXTRACTED IN `learn-home.ts`,
 * AND THAT IS LOAD-BEARING. `expert_person_id` ALONE IS THE KNOWN-WRONG ANSWER
 * AND IT HAS ALREADY COST ONCE — it *"would have shown Linus none of Advanced
 * Procurement despite his 18 lessons in it"*. Marelise teaches 33 lessons across
 * four paths; a lead-only check locks her out of her own courses.
 *
 * ⚠ AN INSTRUCTOR REACHES THE FORUM OF AN UNPLAYABLE PATH, exactly as `E362`
 * established for the path itself. Playability gates the LEARNER, never the
 * person who recorded it.
 */
export async function canAccessPathForum(
  viewer: Viewer | null,
  learningPathId: string
): Promise<boolean> {
  /* ⚠ A SIGNED-OUT VISITOR SEES THAT THE FORUM EXISTS AND NEVER ITS CONTENT. */
  if (!viewer) return false;

  const enrolled = await prisma.learnEnrollment.findFirst({
    where: { user_id: viewer.userId, learning_path_id: learningPathId },
    select: { id: true },
  });
  if (enrolled) return true;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return false;

  /* ⚠ NOT `status: "PUBLISHED"` HERE. `getPathsTaughtBy` filters to published
     because it feeds a PUBLIC profile; an instructor must reach the forum of a
     draft path they are still recording. Same predicate, different scope, and
     the difference is deliberate. */
  const taught = await prisma.learningPath.findFirst({
    where: { id: learningPathId, ...teachesPathWhere(person.id) },
    select: { id: true },
  });
  return Boolean(taught);
}

/**
 * ⚠⚠ THE PUBLIC TEASER — A COUNT, AND NOTHING ELSE, EVER.
 *
 * `A COUNT IS A FACT ABOUT THE ROOM; A TITLE IS A THING SOMEBODY WROTE.` That
 * distinction is the whole reason the closed room stays trustworthy, and
 * `check:forums` asserts it — adding a `latestThreadTitle` to this return type
 * FAILS the harness by design.
 *
 * ⚠ SO: NO THREAD TITLES, NO SNIPPETS, NO AUTHOR NAMES, NO TIMESTAMPS THAT
 * IDENTIFY A POST. Only how many threads and how many people are in the room.
 *
 * ⚠⚠ AND THE COUNT RENDERS ONLY ABOVE ZERO — the caller's job, but the reason
 * belongs here: a forum advertising *"0 threads"* is an anti-advertisement.
 * Identical rule to the unread badge, to `declinedCount` rendering nowhere, and
 * to `$0` never standing in for a rate. Scott, on the LEARN home: *"coming in to
 * a bunch of what look like incomplete tiles is not a good look."*
 */
export type PathForumTeaser = {
  /** ⚠ A FACT ABOUT THE ROOM. Zero is honest; the caller shows no number. */
  threads: number;
  /** How many people can post — enrolments. A fact about the room. */
  members: number;
  /** Whether THIS viewer may open it. */
  canOpen: boolean;
};

export async function getPathForumTeaser(
  viewer: Viewer | null,
  learningPathId: string
): Promise<PathForumTeaser> {
  const board = await prisma.forumBoard.findFirst({
    where: { learning_path_id: learningPathId },
    /* ⚠⚠ COUNTS ONLY. NO `threads: { select: { title: true } }`, NOT EVEN
       `take: 1`. The moment a title enters this select it can reach a
       non-member, and the harness fails the build for it. */
    select: { id: true, slug: true, _count: { select: { threads: true } } },
  });
  const [members, canOpen] = await Promise.all([
    prisma.learnEnrollment.count({ where: { learning_path_id: learningPathId } }),
    canAccessPathForum(viewer, learningPathId),
  ]);
  return {
    threads: board?._count.threads ?? 0,
    members,
    canOpen,
  };
}

/**
 * ⚠⚠ THE BOARD IS PART OF WHAT A PATH IS. Scott: *"this needs to be baked into
 * the LP creation."*
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — `E383`'s first draft said *"CREATE LAZILY —
 * on first visit to a path's forum, not in bulk. A room created before anyone
 * asks for it is an empty room by construction."*
 *
 * ⚠⚠ THAT CONFLATED WHETHER A BOARD *EXISTS* WITH WHETHER ANYONE *SEES AN EMPTY
 * ROOM*. The empty-room risk is a LISTING problem and `listBoards()` already
 * solves it by excluding path boards. Lazy creation defended a risk that no
 * longer existed — and it was worse in one concrete way: A PAGE READ WOULD
 * PERFORM A DATABASE WRITE. `ensureBoards()` gets away with that because it is
 * four fixed rows; doing it per path on every path-page view is a write on every
 * read, scaled by traffic, on a page meant to be fast.
 *
 * ⚠ IDEMPOTENT BY THE SAME SHAPE `ensureBoards` USES, so the backfill, the seed
 * and `createPath` can all call it safely. ⚠ TITLE AND DESCRIPTION ARE THE
 * PATH'S OWN — NO NEW COPY WAS WRITTEN.
 */
export async function ensurePathBoard(
  tx: Pick<typeof prisma, "forumBoard">,
  path: { id: string; title: string; slug: string; summary?: string | null }
) {
  /* ⚠ THE SLUG IS STILL DERIVED because `slug` is `@unique` and the routes read
     it — but the RELATION is the column, so a path slug change never orphans a
     board. That is exactly why `E383` chose a column over a slug convention. */
  const slug = `path-${path.slug}`;
  return tx.forumBoard.upsert({
    where: { slug },
    /* ⚠ ON UPDATE THE TITLE FOLLOWS THE PATH, so renaming a path renames its
       room. `learning_path_id` is set on update too, so a board that predates
       the column gets adopted rather than duplicated. */
    update: {
      title: path.title,
      description: path.summary ?? null,
      learning_path_id: path.id,
    },
    create: {
      slug,
      title: path.title,
      description: path.summary ?? null,
      learning_path_id: path.id,
      /* ⚠ SORTED AFTER THE FOUR SEEDED BOARDS (0,10,20,30) so that if a path
         board ever IS listed somewhere, it never displaces them. */
      sort_order: 1000,
    },
    select: { id: true, slug: true },
  });
}
