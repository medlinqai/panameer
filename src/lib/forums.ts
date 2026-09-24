/*
  ── ⚠⚠ RULING 1: THE WORD IS "GROUPS" (`P2-A3-E619` WS-C) ────────────────
  ⚠ SCOTT, 2026-09-22: *"The word is Groups everywhere. **Forum** and **Room**
  disappear from the interface** — the menu, the page, the headings, the
  buttons and the empty states."* ⚠⚠ DATA AND TABLE NAMES STAY (`ForumBoard`,
  `forum_boards`, `forums.ts`); only the words people READ change.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   This forum is for people taking the path. Enroll to join the conversation.
*/
import { prisma } from "@/lib/prisma";
import { canLeaveGroup, groupOffer, isGroupMember } from "@/lib/group-membership";
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

/*
  ── ⚠⚠⚠ `listBoards()` IS DELETED, AND SO IS THE RULE IT CLAIMED TO CARRY
     (`P2-A3-E612`, 2026-09-24) ─────────────────────────────────────────────

  ⚠⚠ SCOTT: **`E164` preserves superseded DECISIONS, quoted in comments — it
  does not preserve dead exports.** Three dead Learn exports went the same way
  at `E608`. ⚠ Measured before removal, comments stripped: **zero callers in
  `src/`**; only its own declaration and two gate assertions.

  ⚠⚠⚠ AND THE RULE IT GUARDED IS ALREADY FALSE ON THE LIVE PATH. It said *"a
  path board NEVER appears in the general listing"*. ⚠ MEASURED **AND
  RENDERED** 2026-09-24, signed in as a teacher at `/community/groups`: **8
  board links, 4 of them path boards**, each marked `Teach`, beside the four
  general rooms. A stranger sees 4 general and **0** path boards.

  ⚠ THAT IS NOT A DEFECT — IT IS `E591`'s DESIGN. The rail is *"Your Groups"*,
  and it lists the rooms you are IN. The fragmentation the old rule feared was
  *"twelve mostly-empty rooms sitting next to four that have a chance of
  filling"* — rooms you have nothing to do with. A room you teach is not that.
  ⚠⚠ SO THE OLD RULE IS SUPERSEDED IN FACT, and `check:forums` §4 was green
  about a function nobody called while the live listing did the opposite.

  ⚠⚠⚠ WHAT REPLACES IT, AND IT IS THE RULE WORTH HAVING: **a path board is
  listed only to someone enrolled in or teaching that path — never to a
  stranger.** That is the access rule, applied to the listing, and it is
  asserted against the LIVE path in `check:forums` §4.
*/

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
  /* ⚠ `P2-A3-E612` — the verdict is kept, not re-asked. The page needs it
     again below to say whether the viewer is in the room. */
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
      /* ⚠ THE PATH COMES BACK SO THE PAGE CAN POINT AT IT (`P1-ALL-E381` WS-2).
         `E383` reused the general forum chrome, which breadcrumbs to
         `/community/groups` — a list path boards are DELIBERATELY excluded from,
         so the link was a dead end. ⚠ `null` FOR THE FOUR GENERAL BOARDS, whose
         breadcrumb is unchanged. */
      learningPath: { select: { slug: true, title: true } },
      description: true,
      /* ⚠ `P2-A3-E612` — the group's own facts. `id` so the join control has
         something to post; `type` and the price so the page can say what this
         room IS. ⚠⚠ `host_person_id` COMES BACK FOR DISPLAY ONLY — `E572` and
         Scott, 2026-09-23: **ownership is not authority for access**, and
         approval authority for a paid group is ruled when Shop can sell. */
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
    /* ⚠ `P2-A3-E612` — what this group is, and what it offers THIS viewer. */
    type: board.type,
    priceCents: board.price_cents,
    pricePeriod: board.price_period,
    /* ⚠⚠ THE OWNER IS A NAME ON THE PAGE AND NOTHING ELSE. */
    owner: board.hostPerson
      ? {
          id: board.hostPerson.id,
          name: `${board.hostPerson.first_name} ${board.hostPerson.last_name}`.trim(),
        }
      : null,
    /* ⚠ A COUNTED FIGURE — `ACTIVE` rows only, scoped to this board. */
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
    /* ⚠ `null` FOR THE FOUR GENERAL BOARDS (`P1-ALL-E381` WS-2). The page
       breadcrumbs to the path when this is set, and to `/community/groups` when
       it is not — which is the general boards' unchanged behaviour. */
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
    select: {
      board: { select: { learning_path_id: true } },
    },
  });
  if (gate?.board?.learning_path_id) {
    const allowed = await canAccessPathForum(viewer, gate.board.learning_path_id);
    if (!allowed) return null;
  }
  /* ⚠ `P2-J3-E558` WS-B — may THIS viewer confirm here? Same predicate as
     `loadForConfirming` and as `canAccessPathForum`, so authority and access
     agree and nobody is shown a thread they cannot act on. */
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
          /* ⚠⚠ WHO CONFIRMED, NOT JUST THAT IT WAS CONFIRMED (`P2-J3-E558` WS-B).
             ⚠ Scott, 2026-09-18: *"Wide authority needs visible attribution as
             its counterweight."* The predicate is `teachesPathWhere`, which
             includes lesson-level experts, so "the instructor said so" is too
             vague to be checkable — a NAME is what makes it answerable.
             ⚠ Already stored; this only renders it. */
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
      /* ⚠ AND NOT ON THEIR OWN REPLY. A thread author who also answers must not
         be able to mark themselves helpful — that is the one shape of this
         mechanic that would be farmable by a single account. */
      canMarkHelpful: viewerIsThreadAuthor && p.author.id !== viewerPersonId,
      instructorConfirmedAt: p.instructor_confirmed_at
        ? p.instructor_confirmed_at.toISOString()
        : null,
      /* ⚠ NULL when the confirmer's account is gone — `SetNull` leaves the
         timestamp standing. Read that as "confirmed, by someone no longer
         here", never as "not confirmed". */
      instructorConfirmedBy: p.instructorConfirmer
        ? `${p.instructorConfirmer.first_name} ${p.instructorConfirmer.last_name}`.trim()
        : null,
      /*
        ⚠⚠ A DIFFERENT AUTHORITY FROM `canMarkHelpful`, NOT A WIDER ONE. That
        one is the ASKER; this is the PATH'S INSTRUCTOR.
        ⚠ AND NOT ON THEIR OWN REPLY — an instructor who answers in a path they
        teach must not close the loop on their own correctness. That refusal is
        enforced in `loadForConfirming`; this flag only hides the button, and a
        hidden control is not a permission.
      */
      canConfirm: viewerTeachesPath && p.author.id !== viewerPersonId,
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
        "This group is for people taking the path. Enroll to join the conversation.",
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

/**
 * ── ⚠⚠ THE INSTRUCTOR'S CONFIRMATION (`P2-J3-E558` WS-B) ──────────────────
 *
 * ⚠⚠ A DIFFERENT QUESTION FROM A DIFFERENT AUTHORITY. `markHelpful` asks *did
 * this answer my question* and belongs to the ASKER. This asks *is this answer
 * correct* and belongs to the INSTRUCTOR OF THE PATH. They can disagree in both
 * directions, which is why they are two columns.
 *
 * ⚠⚠⚠ TWO REFUSALS, AND THE SECOND IS THE FARMABLE SHAPE. `canMarkHelpful`
 * already refuses the viewer's own reply; it applies HARDER here, because an
 * instructor who answers in a path they TEACH could otherwise confirm
 * themselves — a single account closing the loop on its own correctness.
 *
 * ⚠ AUTHORITY IS DERIVED FROM THE BOARD, NOT ASSERTED BY THE CALLER:
 * `ForumPost -> ForumThread -> ForumBoard.learning_path_id ->
 * LearningPath.expert_person_id`. ⚠⚠ A GENERAL BOARD HAS NO PATH AND THEREFORE
 * HAS NO INSTRUCTOR — nobody can confirm there, and that is correct rather than
 * a gap: there is no one whose subject-matter authority the board represents.
 */
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
  /* ⚠⚠ `teachesPathWhere`, NEVER `expert_person_id`. Measured 2026-09-18: only
     10 of 23 paths HAVE a path-level expert, and the narrow field would have
     locked Scott out of all 16 paths he teaches across 338 lessons, and
     Marelise out of 1 of her 5. `check:forums` bans the narrow field in this
     file for exactly that reason, and it was right. */
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
  /* ⚠⚠ THE FARMABLE SHAPE, REFUSED. An instructor answering in their own path
     must not be able to confirm themselves. */
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

/** Undo it. ⚠ Same authority — an instructor who mis-clicks has to reverse it. */
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
export async function pathForumAccess(
  viewer: Viewer | null,
  learningPathId?: string
): Promise<{ enrolled: Set<string>; taught: Set<string> }> {
  const none = { enrolled: new Set<string>(), taught: new Set<string>() };
  /* ⚠ A SIGNED-OUT VISITOR SEES THAT THE FORUM EXISTS AND NEVER ITS CONTENT. */
  if (!viewer) return none;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  /* ⚠ THE SCOPE IS THE ONLY THING `learningPathId` CHANGES. Both conditions are
     asked either way; narrowing keeps the single-path callers cheap. */
  const pathFilter = learningPathId ? { learning_path_id: learningPathId } : {};
  const idFilter = learningPathId ? { id: learningPathId } : {};

  const [enrolments, taughtRows] = await Promise.all([
    prisma.learnEnrollment.findMany({
      where: { user_id: viewer.userId, ...pathFilter },
      select: { learning_path_id: true },
    }),
    /* ⚠ NOT `status: "PUBLISHED"` HERE. `getPathsTaughtBy` filters to published
       because it feeds a PUBLIC profile; an instructor must reach the forum of a
       draft path they are still recording. Same predicate, different scope, and
       the difference is deliberate. */
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

/**
 * ⚠⚠ THE SINGLE-PATH QUESTION, ANSWERED BY THE SET ABOVE AND NOWHERE ELSE.
 *
 * ⚠⚠⚠ `P2-A4-E610` — `getForumsHome` HELD A SECOND, INDEPENDENT COPY OF THIS
 * RULE, and it was the copy that mattered most: the rail AND the *"Recent in
 * Your Forums"* thread list are built from it, so **thread titles were released
 * to a viewer by the restatement, not by this function.** ⚠ `check:forums`
 * guarded only this one. Two implementations of a private-room rule, one of
 * them ungated, is how a closed room quietly opens.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the body this function had while
 * the duplicate existed:
 * //   const enrolled = await prisma.learnEnrollment.findFirst({
 * //     where: { user_id: viewer.userId, learning_path_id: learningPathId },
 * //     select: { id: true },
 * //   });
 * //   if (enrolled) return true;
 * //   const person = await prisma.person.findUnique({ … });
 * //   if (!person) return false;
 * //   const taught = await prisma.learningPath.findFirst({
 * //     where: { id: learningPathId, ...teachesPathWhere(person.id) },
 * //     select: { id: true },
 * //   });
 * //   return Boolean(taught);
 */
export async function canAccessPathForum(
  viewer: Viewer | null,
  learningPathId: string
): Promise<boolean> {
  const access = await pathForumAccess(viewer, learningPathId);
  return access.enrolled.has(learningPathId) || access.taught.has(learningPathId);
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

/**
 * ── ⚠⚠ THE FORUMS LANDING (`P2-J3-E558` WS-B) ─────────────────────────────
 *
 * ⚠ THE VIEWER IS IN MANY ROOMS AND MOST ARE EMPTY. A page that lists them all
 * is a wall of empty rooms, so ACTIVITY LEADS AND ROOMS GO IN THE RAIL.
 *
 * ⚠⚠ THE JOIN ALREADY EXISTED AND NOTHING HERE INVENTS IT:
 * `ForumBoard.learning_path_id` (`P1-J3-E383`) × `teachesPathWhere`.
 *
 * ⚠⚠⚠ ONE DEFINITION OF "TEACH", USED EVERYWHERE: `teachesPathWhere`
 * (`learn-home.ts:567`). The panel, `loadForConfirming`, `getThread`'s
 * `canConfirm` and `canAccessPathForum` all read it, so ACCESS AND AUTHORITY
 * AGREE and nobody is shown a thread they cannot act on.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the first version of this block
 * claimed TWO definitions were used deliberately, the narrow
 * `LearningPath.expert_person_id` for the panel and authority, the broad one for
 * the rail:
 *
 *     ⚠⚠⚠ TWO DEFINITIONS OF "TEACH" EXIST AND THIS FUNCTION USES BOTH, ON
 *     PURPOSE … ⚠ So a lesson-level expert sees the room, marked `Teach`, and
 *     does NOT see it in the instructor panel — correct, because they cannot
 *     confirm in it.
 *
 * ⚠⚠ THAT WAS THE RIGHT INSTINCT POINTED AT THE WRONG CAUSE, AND IT IS RECORDED
 * SO NOBODY RECONSTRUCTS THE WORKAROUND. The inconsistency it was designing
 * around existed ONLY because the narrow field was the wrong predicate. Using
 * the right one does not SOLVE the mismatch — the mismatch DISAPPEARS.
 * ⚠ MEASURED 2026-09-18, which is why: only 10 of 23 paths have a path-level
 * expert, and `expert_person_id` would have locked SCOTT out of all 16 paths he
 * teaches across 338 lessons, and Marelise out of 1 of her 5. `check:forums`
 * bans the narrow field in this file and has four assertions guarding the
 * single definition.
 */
export async function getForumsHome(viewer: Viewer) {
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  /*
    ⚠⚠⚠ THE ACCESS RULE IS CALLED, NOT RESTATED (`P2-A4-E610`).
    ⚠ SCOTT, 2026-09-23: *"B′ is what releases thread titles to the rail, and
    `check:forums` guards only B."* ⚠⚠ This block held a byte-different second
    implementation of `canAccessPathForum`'s two conditions — same two facts,
    separate code, and the ungated one was the one that decided what titles a
    member could read.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const [enrolments, taughtBroad] = await Promise.all([
    //     prisma.learnEnrollment.findMany({
    //       where: { user_id: viewer.userId },
    //       select: { learning_path_id: true },
    //     }),
    //     person
    //       ? prisma.learningPath.findMany({
    //           where: teachesPathWhere(person.id),
    //           select: { id: true },
    //         })
    //       : Promise.resolve([]),
    //   ]);
    //   const enrolledPathIds = new Set(enrolments.map((e) => e.learning_path_id));
    //   const taughtPathIds = new Set(taughtBroad.map((p) => p.id));
  */
  const access = await pathForumAccess(viewer);
  const taughtPathIds = access.taught;
  const myPathIds = [...new Set([...access.enrolled, ...access.taught])];

  /* ⚠ THE FOUR GENERAL BOARDS ARE OPEN TO EVERYONE — `learning_path_id` NULL.
     They belong in the rail beside the path rooms. */
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
    /* ⚠ `Teach` vs enrolled — DIFFERENT RELATIONSHIPS, and the mark is what
       explains why the instructor panel applies to some rooms and not others. */
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

  /* ⚠⚠ SCOTT, 2026-09-17: UNANSWERED MEANS ZERO REPLIES. Literally that — no
     instructor qualifier, no "no expert reply" reading. */
  const noReplies = instructorThreads.filter((t) => t.posts.length === 0).map(shape);
  /* ⚠ Replies exist, NONE of them from the viewer. */
  const unweighed = instructorThreads
    .filter((t) => t.posts.length > 0 && !t.posts.some((p) => p.author_id === person?.id))
    .map(shape);

  return {
    noReplies,
    unweighed,
    recent: recent.map(shape),
    rooms,
    /* ⚠ `teaches` DRIVES WHETHER THE PANEL RENDERS AT ALL — somebody who teaches
       nothing should not be shown an empty instructor panel. */
    teaches: expertBoardIds.length > 0,
  };
}

/**
 * ── ⚠⚠⚠ THREADS WAITING ON THE TEACHER (`P2-A2-E603` WS-C) ───────────────
 *
 * ⚠ SCOTT'S DEFINITION, 2026-09-23: *"A thread in a path you teach, where the
 * teacher has not replied, AND no reply is marked helpful."*
 * ⚠⚠ BOTH CLAUSES ARE REQUIRED, and each answers a different way the queue
 * would otherwise lie:
 *   · ⚠ WITHOUT the teacher clause, a thread somebody ELSE resolved still sits
 *     in the teacher's queue — it is not waiting on them.
 *   · ⚠⚠ WITHOUT the helpful clause, a thread answered well but never marked
 *     sits there FOREVER. `marked_helpful_at` is set by the ASKER, so it can
 *     simply never arrive.
 *
 * ── ⚠⚠⚠ IT LIVES HERE, NOT IN `lib/statistics.ts`, AND A GATE SAID SO ────
 *
 * ⚠ It was written in `statistics.ts` first, and **`check:community` GUARD 2
 * went red**: *"`marked_helpful_*` is written in exactly one file"*.
 * ⚠⚠ THE GUARD WAS RIGHT AND THE CODE WAS WRONG. Its own comment states the
 * rule — *"the mapping is the lib's job"* — and a statistics module reaching
 * into forum internals is exactly the coupling it exists to prevent. ⚠⚠⚠ THE
 * FIX IS TO MOVE THE QUERY, NOT TO EXEMPT THE FILE: *"exempting the file is
 * exactly how a guard stops guarding"*, in the guard's own words.
 * ⚠ Strictly it is a READ — `marked_helpful_at: { not: null }` is a FILTER, not
 * an assignment — so the guard is over-broad by a hair. **It is still not worth
 * widening**: the query belongs here on the merits, and a narrower regex would
 * be a change to a gate in order to keep code where it did not belong.
 *
 * ⚠ `ForumThread` holds ZERO rows today, so this returns a measured `0`. That
 * is a real zero and renders as `0`, never as a dash.
 */
export async function countThreadsWaitingOn(
  personId: string,
  pathIds: string[]
): Promise<number> {
  if (pathIds.length === 0) return 0;
  return prisma.forumThread.count({
    where: {
      board: { learning_path_id: { in: pathIds } },
      /* ⚠⚠ TWO `posts` FILTERS, SO THEY GO IN AN `AND` — one object cannot
         carry the key twice, and merging them into a single `none` would ask a
         different question: *"no post is BOTH the teacher's and helpful"*,
         which is true of almost every thread. */
      AND: [
        { posts: { none: { author_id: personId } } },
        { posts: { none: { marked_helpful_at: { not: null } } } },
      ],
    },
  });
}

/**
 * The threads waiting on you, oldest first — the rows behind `Needs You`.
 *
 * ── ⚠⚠⚠ IT LIVES HERE FOR THE SAME REASON `countThreadsWaitingOn` DOES ───
 *
 * ⚠ `check:community` GUARD 2 — *"`marked_helpful_*` is written in exactly one
 * file"* — went RED when this query was written in `groups-home.ts`, exactly as
 * it did when `countThreadsWaitingOn` was written in `statistics.ts`.
 * ⚠⚠ THE GUARD WAS RIGHT BOTH TIMES AND THE CODE WAS WRONG BOTH TIMES. The
 * mapping from *"helpful"* to *"answered"* is this module's job, and a page's
 * read model reaching into forum internals is the coupling the guard exists to
 * prevent. ⚠⚠⚠ THE FIX IS TO MOVE THE QUERY, NOT TO EXEMPT THE FILE —
 * *"exempting the file is exactly how a guard stops guarding"*, in the guard's
 * own words, and the precedent is three lines up.
 *
 * ⚠ IT IS THE SAME PREDICATE AS `countThreadsWaitingOn`, BY CONSTRUCTION — the
 * count and the list must never disagree about what "waiting" means, which is
 * `E585` applied to a figure and the rows beneath it. ⚠⚠ The difference is
 * SCOPE ONLY: that one takes paths, this takes boards, because a member-created
 * group has no path and would otherwise be unreachable by the question.
 */
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
    /* ⚠ OLDEST FIRST — the brief's order, and the honest one: the question that
       has waited longest is the one that has been failed longest. */
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
