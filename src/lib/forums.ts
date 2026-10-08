// RULING 1: THE WORD IS "GROUPS" WS-C)
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { canLeaveGroup, groupOffer, isGroupMember } from "@/lib/group-membership";
/* `P1-J3-E383` — ONE instructor predicate, extracted rather than copied. */
import { teachesPathWhere } from "@/lib/learn-home";
import type { Viewer } from "@/lib/access";
import {
  communityIdentityGapsForPerson,
  type CommunityGap,
} from "@/lib/community-identity";

/** Forums (PHASE 2 / WS2-C) — board list → threads → posts. */

export class ForumError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "INVALID"
      // Distinct from INVALID because the fix is not in the
      | "IDENTITY_REQUIRED"
      // A PATH FORUM IS CLOSED — enrolled learners and the
      | "NOT_ENROLLED",
    /** Populated for IDENTITY_REQUIRED: the named fields, with their links. */
    public fields?: CommunityGap[]
  ) {
    super(message);
    this.name = "ForumError";
  }
}

/** THE WRITE GATE — name · photo · job title. */
async function requireIdentity(personId: string): Promise<void> {
  const gaps = await communityIdentityGapsForPerson(personId);
  if (gaps.length === 0) return;
  throw new ForumError(
    gaps.map((g) => `${g.field} — ${g.reason}`).join(" "),
    "IDENTITY_REQUIRED",
    gaps
  );
}

/** THE BOARDS ARE SEEDED, NOT USER-CREATED. */
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

// SCOTT: preserves superseded DECISIONS, quoted in comments — it

/** One board and its threads, newest activity first. */
/** TAKES A VIEWER AS OF , BECAUSE A PATH BOARD IS CLOSED. */
export async function getBoard(slug: string, viewer: Viewer | null = null) {
  await ensureBoards();
  const gate = await prisma.forumBoard.findUnique({
    where: { slug },
    select: { learning_path_id: true },
  });
  // THE GATE RUNS BEFORE THE READ, so a closed board never assembles its
  // — the verdict is kept, not re-asked. The page needs it
  let pathAccess = false;
  if (gate?.learning_path_id) {
    pathAccess = await canAccessPathForum(viewer, gate.learning_path_id);
    if (!pathAccess) return null;
  }
  const board = await prisma.forumBoard.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      // THE PATH COMES BACK SO THE PAGE CAN POINT AT IT WS-2).
      learningPath: { select: { slug: true, title: true } },
      description: true,
      // — the group's own facts. `id` so the join control has
      id: true,
      type: true,
      price_cents: true,
      price_period: true,
      learning_path_id: true,
      hostPerson: { select: { id: true, first_name: true, last_name: true } },
      _count: { select: { members: { where: { state: "ACTIVE" } } } },
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
  const member = await isGroupMember(
    viewer,
    { id: board.id, learning_path_id: board.learning_path_id },
    pathAccess
  );

  return {
    id: board.id,
    slug: board.slug,
    title: board.title,
    description: board.description,
    /* `P2-A3-E612` — what this group is, and what it offers THIS viewer. */
    type: board.type,
    priceCents: board.price_cents,
    pricePeriod: board.price_period,
    /* THE OWNER IS A NAME ON THE PAGE AND NOTHING ELSE. */
    owner: board.hostPerson
      ? {
          id: board.hostPerson.id,
          name: `${board.hostPerson.first_name} ${board.hostPerson.last_name}`.trim(),
        }
      : null,
    /* A COUNTED FIGURE — `ACTIVE` rows only, scoped to this board. */
    memberCount: board._count.members,
    isMember: member,
    canLeave: canLeaveGroup({ learning_path_id: board.learning_path_id }),
    offer: groupOffer(
      {
        type: board.type,
        price_cents: board.price_cents,
        price_period: board.price_period,
        learning_path_id: board.learning_path_id,
      },
      member
    ),
    // breadcrumbs to the path when this is set, and to `/connect/groups` when
    learningPath: board.learningPath,
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
/** the board itself — reaching it by its own id must not be a way around the */
export async function getThread(
  id: string,
  viewerPersonId?: string | null,
  viewer: Viewer | null = null
) {
  // THE GATE BEFORE THE READ. A deep link to a thread id is the obvious hole
  const gate = await prisma.forumThread.findUnique({
    where: { id },
    select: {
      board: { select: { learning_path_id: true } },
    },
  });
  if (gate?.board?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, gate.board.learning_path_id);
    if (!allowed) return null;
  }
  // WS-B — may THIS viewer confirm here? Same predicate as
  const gatePathId = gate?.board?.learning_path_id ?? null;
  const viewerTeachesPath =
    gatePathId && viewerPersonId
      ? Boolean(
          await prisma.learningPath.findFirst({
            where: { id: gatePathId, ...teachesPathWhere(viewerPersonId) },
            select: { id: true },
          })
        )
      : false;

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
          instructor_confirmed_at: true,
          // WHO CONFIRMED, NOT JUST THAT IT WAS CONFIRMED WS-B).
          instructorConfirmer: { select: { first_name: true, last_name: true } },
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
      // AND NOT ON THEIR OWN REPLY. A thread author who also answers must not
      canMarkHelpful: viewerIsThreadAuthor && p.author.id !== viewerPersonId,
      instructorConfirmedAt: p.instructor_confirmed_at
        ? p.instructor_confirmed_at.toISOString()
        : null,
      // NULL when the confirmer's account is gone — `SetNull` leaves the
      instructorConfirmedBy: p.instructorConfirmer
        ? `${p.instructorConfirmer.first_name} ${p.instructorConfirmer.last_name}`.trim()
        : null,
      // A DIFFERENT AUTHORITY FROM `canMarkHelpful`, NOT A WIDER ONE. That
      canConfirm: viewerTeachesPath && p.author.id !== viewerPersonId,
    })),
  };
}

/** THE CREDIT HOOK POINT (PHASE 3). */
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
    /* `P2-A3-E620` — the owner and title are what the worklist item needs. */
    select: { id: true, learning_path_id: true, host_person_id: true, title: true },
  });
  if (!board) throw new ForumError("That board doesn't exist.", "NOT_FOUND");
  // A PATH FORUM IS CLOSED TO POSTING TOO — enrolled learners
  if (board.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, board.learning_path_id);
    if (!allowed) {
      throw new ForumError(
        "This group is for people taking the path. Enroll to join the conversation.",
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

  // THE GROUP'S OWNER OWES AN ANSWER , ruling 34e)
  if (board.host_person_id && board.host_person_id !== person.id) {
    await notify({
      event: "group.question_asked",
      personId: board.host_person_id,
      entityType: "forum_thread",
      entityId: thread.id,
      dedupeKey: `group.question_asked:${thread.id}`,
      vars: { groupTitle: board.title, threadTitle: title.slice(0, 200), threadId: thread.id },
    });
  }
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
    select: { id: true, title: true, author_id: true, board: { select: { learning_path_id: true, title: true } } },
  });
  /* SAME GATE, REACHED THROUGH THE THREAD'S BOARD. A reply is a post. */
  if (thread?.board?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, thread.board.learning_path_id);
    if (!allowed) {
      throw new ForumError(
        "This group is for people taking the path. Enroll to join the conversation.",
        "NOT_ENROLLED"
      );
    }
  }
  if (!thread) throw new ForumError("That thread no longer exists.", "NOT_FOUND");

  // The post and the thread's denormalised counters move together. Without the
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

  // Attention rule (2026-10-08): a reply tells everyone already in the thread — the starter and earlier repliers, not the replier.
  const earlier = await prisma.forumPost.findMany({ where: { thread_id: thread.id, id: { not: post.id } }, select: { author_id: true }, distinct: ["author_id"] });
  const who = [...new Set([thread.author_id, ...earlier.map((p) => p.author_id)])].filter((id) => id && id !== person.id);
  if (who.length) {
    const me = await prisma.person.findUnique({ where: { id: person.id }, select: { first_name: true, last_name: true } });
    const fromName = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "Someone";
    for (const personId of who)
      await notify({
        event: "group.reply_posted",
        personId,
        entityType: "forum_post",
        entityId: post.id,
        dedupeKey: `group.reply_posted:${post.id}:${personId}`,
        vars: { fromName, threadTitle: (thread.title ?? "").slice(0, 120), groupTitle: thread.board?.title ?? "", threadId: thread.id },
      });
  }
  return post;
}

// ---------------------------------------------------------------------------
// "This answered my question" (brief_community_signal WS1)
// ---------------------------------------------------------------------------

/** MARK A REPLY HELPFUL — the only involvement signal this product has. */
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

/** THE INSTRUCTOR'S CONFIRMATION WS-B) */
async function loadForConfirming(viewer: Viewer, postId: string) {
  const person = await ownPerson(viewer);
  const post = await prisma.forumPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      author_id: true,
      instructor_confirmed_at: true,
      thread: { select: { id: true, board: { select: { learning_path_id: true } } } },
    },
  });
  if (!post) throw new ForumError("That reply no longer exists.", "NOT_FOUND");

  const pathId = post.thread.board.learning_path_id;
  if (!pathId) {
    throw new ForumError(
      "This board has no path, so answers here can't be confirmed.",
      "INVALID"
    );
  }
  // 10 of 23 paths HAVE a path-level expert, and the narrow field would have
  const teaches = await prisma.learningPath.findFirst({
    where: { id: pathId, ...teachesPathWhere(person.id) },
    select: { id: true },
  });
  if (!teaches) {
    throw new ForumError(
      "Only someone who teaches this path can confirm an answer.",
      "INVALID"
    );
  }
  // THE FARMABLE SHAPE, REFUSED. An instructor answering in their own path
  if (post.author_id === person.id) {
    throw new ForumError("You can't confirm your own reply.", "INVALID");
  }
  return { person, post };
}

export async function confirmAnswer(viewer: Viewer, postId: string) {
  const { person, post } = await loadForConfirming(viewer, postId);
  /* Idempotent, like `markHelpful` — double-clicks happen and must not move the
     timestamp. */
  if (post.instructor_confirmed_at) {
    return { id: post.id, instructorConfirmedAt: post.instructor_confirmed_at.toISOString() };
  }
  const updated = await prisma.forumPost.update({
    where: { id: post.id },
    data: { instructor_confirmed_at: new Date(), instructor_confirmed_by: person.id },
    select: { id: true, instructor_confirmed_at: true },
  });
  return {
    id: updated.id,
    instructorConfirmedAt: updated.instructor_confirmed_at
      ? updated.instructor_confirmed_at.toISOString()
      : null,
  };
}

/** Undo it. Same authority — an instructor who mis-clicks has to reverse it. */
export async function unconfirmAnswer(viewer: Viewer, postId: string) {
  const { post } = await loadForConfirming(viewer, postId);
  await prisma.forumPost.update({
    where: { id: post.id },
    data: { instructor_confirmed_at: null, instructor_confirmed_by: null },
  });
  return { id: post.id, instructorConfirmedAt: null };
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


// SCOTT, 2026-09-04: *"every learning path should have a forum."*

/** MAY THIS VIEWER OPEN THIS PATH'S FORUM. Enrolment OR teaching. */
export async function pathForumAccess(
  viewer: Viewer | null,
  learningPathId?: string
): Promise<{ enrolled: Set<string>; taught: Set<string> }> {
  const none = { enrolled: new Set<string>(), taught: new Set<string>() };
  /* A SIGNED-OUT VISITOR SEES THAT THE FORUM EXISTS AND NEVER ITS CONTENT. */
  if (!viewer) return none;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  // THE SCOPE IS THE ONLY THING `learningPathId` CHANGES. Both conditions are
  const pathFilter = learningPathId ? { learning_path_id: learningPathId } : {};
  const idFilter = learningPathId ? { id: learningPathId } : {};

  const [enrolments, taughtRows] = await Promise.all([
    prisma.learnEnrollment.findMany({
      where: { user_id: viewer.userId, ...pathFilter },
      select: { learning_path_id: true },
    }),
    // NOT `status: "PUBLISHED"` HERE. `getPathsTaughtBy` filters to published
    person
      ? prisma.learningPath.findMany({
          where: { ...idFilter, ...teachesPathWhere(person.id) },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    enrolled: new Set(enrolments.map((e) => e.learning_path_id)),
    taught: new Set(taughtRows.map((p) => p.id)),
  };
}

/** THE SINGLE-PATH QUESTION, ANSWERED BY THE SET ABOVE AND NOWHERE ELSE. */
export async function canAccessPathForum(
  viewer: Viewer | null,
  learningPathId: string
): Promise<boolean> {
  const access = await pathForumAccess(viewer, learningPathId);
  return access.enrolled.has(learningPathId) || access.taught.has(learningPathId);
}

/** THE PUBLIC TEASER — A COUNT, AND NOTHING ELSE, EVER. */
export type PathForumTeaser = {
  /** A FACT ABOUT THE ROOM. Zero is honest; the caller shows no number. */
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
    // COUNTS ONLY. NO `threads: { select: { title: true } }`, NOT EVEN
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

/** THE BOARD IS PART OF WHAT A PATH IS. Scott: *"this needs to be baked into */
/** TIER 3, MOVED OUT OF THE ONE-SHOT AND INTO THE WRITER */
async function panameerOwnerId(tx: Pick<typeof prisma, "person">): Promise<string> {
  const staff = await tx.person.findMany({
    where: { is_support: true },
    select: { id: true },
  });
  if (staff.length !== 1) {
    throw new Error(
      `ensurePathBoard: is_support must resolve to exactly one person, found ${staff.length}. ` +
        `Refusing to create an ownerless path group (P2-J3-E662).`
    );
  }
  return staff[0].id;
}

export async function ensurePathBoard(
  tx: Pick<typeof prisma, "forumBoard" | "person">,
  path: { id: string; title: string; slug: string; summary?: string | null },
  /** THE OWNER IS A PARAMETER, AND THE POLICY IS SCOTT'S, NOT MINE */
  ownerPersonId?: string
) {
  // THE SLUG IS STILL DERIVED because `slug` is `@unique` and the routes read
  const slug = `path-${path.slug}`;
  // RESOLVED BEFORE THE UPSERT so a refusal happens before any write, not
  const owner = ownerPersonId ?? (await panameerOwnerId(tx));
  return tx.forumBoard.upsert({
    where: { slug },
    // ON UPDATE THE TITLE FOLLOWS THE PATH, so renaming a path renames its
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
      // THE LINE THAT WAS MISSING . Without it every path created
      host_person_id: owner,
      // SORTED AFTER THE FOUR SEEDED BOARDS (0,10,20,30) so that if a path
      sort_order: 1000,
    },
    select: { id: true, slug: true },
  });
}

/** THE FORUMS LANDING WS-B) */
export async function getForumsHome(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  // THE ACCESS RULE IS CALLED, NOT RESTATED .
  const access = await pathForumAccess(viewer);
  const taughtPathIds = access.taught;
  const myPathIds = [...new Set([...access.enrolled, ...access.taught])];

  // THE FOUR GENERAL BOARDS ARE OPEN TO EVERYONE — `learning_path_id` NULL.
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
      _count: { select: { threads: true } },
    },
  });

  const rooms = boards.map((b) => ({
    slug: b.slug,
    title: b.title,
    threadCount: b._count.threads,
    // explains why the instructor panel applies to some rooms and not others.
    relation: (b.learning_path_id && taughtPathIds.has(b.learning_path_id)
      ? "teach"
      : b.learning_path_id
        ? "enrolled"
        : "general") as "teach" | "enrolled" | "general",
  }));

  const expertBoardIds = boards
    .filter((b) => b.learning_path_id && taughtPathIds.has(b.learning_path_id))
    .map((b) => b.id);

  const threadSelect = {
    id: true,
    title: true,
    created_at: true,
    board: { select: { slug: true, title: true } },
    posts: { select: { author_id: true } },
  } as const;

  const [instructorThreads, recent] = await Promise.all([
    expertBoardIds.length
      ? prisma.forumThread.findMany({
          where: { board_id: { in: expertBoardIds } },
          orderBy: { created_at: "desc" },
          take: 50,
          select: threadSelect,
        })
      : Promise.resolve([]),
    boards.length
      ? prisma.forumThread.findMany({
          where: { board_id: { in: boards.map((b) => b.id) } },
          orderBy: { created_at: "desc" },
          take: 10,
          select: threadSelect,
        })
      : Promise.resolve([]),
  ]);

  const shape = (t: (typeof instructorThreads)[number]) => ({
    id: t.id,
    title: t.title,
    boardSlug: t.board.slug,
    boardTitle: t.board.title,
    replies: t.posts.length,
  });

  // SCOTT, 2026-09-17: UNANSWERED MEANS ZERO REPLIES. Literally that — no
  const noReplies = instructorThreads.filter((t) => t.posts.length === 0).map(shape);
  /* Replies exist, NONE of them from the viewer. */
  const unweighed = instructorThreads
    .filter((t) => t.posts.length > 0 && !t.posts.some((p) => p.author_id === person?.id))
    .map(shape);

  return {
    noReplies,
    unweighed,
    recent: recent.map(shape),
    rooms,
    // nothing should not be shown an empty instructor panel.
    teaches: expertBoardIds.length > 0,
  };
}

/** THREADS WAITING ON THE TEACHER WS-C) */
export async function countThreadsWaitingOn(
  personId: string,
  pathIds: string[]
): Promise<number> {
  if (pathIds.length === 0) return 0;
  return prisma.forumThread.count({
    where: {
      board: { learning_path_id: { in: pathIds } },
      // TWO `posts` FILTERS, SO THEY GO IN AN `AND` — one object cannot
      AND: [
        { posts: { none: { author_id: personId } } },
        { posts: { none: { marked_helpful_at: { not: null } } } },
      ],
    },
  });
}

/** The threads waiting on you, oldest first — the rows behind `Needs You`. */
export async function listThreadsWaitingOn(
  personId: string,
  boardIds: string[],
  take = 5
) {
  if (boardIds.length === 0) return [];
  const rows = await prisma.forumThread.findMany({
    where: {
      board_id: { in: boardIds },
      AND: [
        { posts: { none: { author_id: personId } } },
        { posts: { none: { marked_helpful_at: { not: null } } } },
      ],
    },
    // OLDEST FIRST — the brief's order, and the honest one: the question that
    orderBy: { created_at: "asc" },
    take,
    select: {
      id: true,
      title: true,
      created_at: true,
      board: { select: { slug: true, title: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    boardSlug: t.board.slug,
    boardTitle: t.board.title,
    askedAt: t.created_at,
  }));
}
