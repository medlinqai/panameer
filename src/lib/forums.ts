import { prisma } from "@/lib/prisma";
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
      | "IDENTITY_REQUIRED",
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
export async function getBoard(slug: string) {
  await ensureBoards();
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
export async function getThread(id: string, viewerPersonId?: string | null) {
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
    select: { id: true },
  });
  if (!board) throw new ForumError("That board doesn't exist.", "NOT_FOUND");

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
    select: { id: true },
  });
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
