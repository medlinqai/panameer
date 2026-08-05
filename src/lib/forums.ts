import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

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
  constructor(message: string, public code: "NOT_FOUND" | "INVALID") {
    super(message);
    this.name = "ForumError";
  }
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

/** One thread: the opening post plus every reply, oldest first. */
export async function getThread(id: string) {
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
          author: { select: authorSelect },
        },
      },
    },
  });
  if (!thread) return null;
  return {
    id: thread.id,
    title: thread.title,
    body: thread.body,
    createdAt: thread.created_at.toISOString(),
    author: authorView(thread.author),
    board: thread.board,
    posts: thread.posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at.toISOString(),
      author: authorView(p.author),
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
