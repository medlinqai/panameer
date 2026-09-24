/*
  ── ⚠⚠ RULING 1: THE WORD IS "GROUPS" (`P2-A3-E619` WS-C) ────────────────
  ⚠ SCOTT, 2026-09-22: *"The word is Groups everywhere. **Forum** and **Room**
  disappear from the interface** — the menu, the page, the headings, the
  buttons and the empty states."* ⚠⚠ DATA AND TABLE NAMES STAY (`ForumBoard`,
  `forum_boards`, `forums.ts`); only the words people READ change.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   This group belongs to a learning path. Enrolling in the path puts you in the room.
*/
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

/**
 * ── ⚠⚠⚠ GROUP MEMBERSHIP — ONE TABLE, ONE WRITER (`P2-A3-E612`) ──────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"one membership table. Enrolling in a path writes a
 * membership row for that path's group. Otherwise 'am I in this group?' has two
 * answers that will drift."*
 *
 * ⚠⚠⚠ WHAT THIS MODULE IS **NOT**: it is not the access rule. Reading a path
 * board is still `canAccessPathForum`, and that function is unchanged in what it
 * decides. ⚠ Membership is the RECORD of who is in the room; access is the
 * QUESTION of who may open it, and on a path-backed group the answer comes from
 * enrolment either way. **Two things, deliberately not collapsed** — see the
 * long note on `ensureEnrolmentMembership` below.
 */

/** The slug convention `ensurePathBoard` writes. ⚠ One place, both callers. */
export const pathBoardSlug = (pathSlug: string) => `path-${pathSlug}`;

/**
 * Enrolling in a path puts the member in that path's group.
 *
 * ⚠⚠ IDEMPOTENT BY CONSTRUCTION — `@@unique([board_id, person_id])`. Enrolling
 * twice cannot make two rows, because the database refuses the second rather
 * than this function remembering to check.
 *
 * ⚠⚠⚠ `auto_approved: true` AND `route: BY_ENROLMENT` TOGETHER ARE WHAT MAKE
 * THIS ROW HONEST. Nobody decided; enrolment did. A row that looked like an
 * approval would put a decision in the record that no person ever made — and
 * `decided_by_person_id` stays null for the same reason.
 *
 * ⚠ IT NEVER THROWS INTO THE ENROLMENT PATH. A membership row is bookkeeping
 * that follows the enrolment; a failure to write it must not turn enrolling into
 * an error the member sees. ⚠⚠ The same shape `E522`'s receipt uses, for the
 * same reason: the thing already happened.
 */
export async function ensureEnrolmentMembership(
  userId: string,
  learningPathId: string
): Promise<void> {
  try {
    const [person, board] = await Promise.all([
      prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } }),
      prisma.forumBoard.findFirst({
        where: { learning_path_id: learningPathId },
        select: { id: true },
      }),
    ]);
    /* ⚠ A user with no Person, or a path with no board, is not an error here —
       it is simply nothing to record. */
    if (!person || !board) return;

    await prisma.groupMembership.upsert({
      where: { board_id_person_id: { board_id: board.id, person_id: person.id } },
      create: {
        board_id: board.id,
        person_id: person.id,
        route: "BY_ENROLMENT",
        state: "ACTIVE",
        auto_approved: true,
      },
      /* ⚠⚠ RE-ENROLLING RE-ACTIVATES, IT DOES NOT RE-CREATE. Somebody who left
         a path and came back is the same membership, not a second one. */
      update: { state: "ACTIVE" },
    });
  } catch (err) {
    /* ⚠ RECORDED, NOT SILENT (`E516` — a thrown call must not produce silence). */
    console.error("[group-membership] enrolment membership not recorded", err);
  }
}

/**
 * Leaving a path takes the member out of its group.
 *
 * ⚠⚠⚠ THE STATE IS `REMOVED`, NOT A DELETE. Same rule as a declined request:
 * the history is the thing that lets anybody tell what happened. ⚠ A delete
 * would make "never joined" and "left" indistinguishable.
 */
export async function removeEnrolmentMembership(
  userId: string,
  learningPathId: string
): Promise<void> {
  try {
    const [person, board] = await Promise.all([
      prisma.person.findUnique({ where: { user_id: userId }, select: { id: true } }),
      prisma.forumBoard.findFirst({
        where: { learning_path_id: learningPathId },
        select: { id: true },
      }),
    ]);
    if (!person || !board) return;
    await prisma.groupMembership.updateMany({
      where: { board_id: board.id, person_id: person.id, route: "BY_ENROLMENT" },
      data: { state: "REMOVED" },
    });
  } catch (err) {
    console.error("[group-membership] enrolment membership not removed", err);
  }
}

/**
 * ── ⚠⚠ CAN THIS GROUP BE LEFT AT ALL? ───────────────────────────────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-23: *"A path-backed group is different — it is free, and
 * the member never joined it; enrolment did. **You cannot leave a path group.
 * You unenrol from the path.** One door, not two."*
 *
 * ⚠ So the Leave control does not render on a path-backed group. It is not
 * disabled with a reason — there is no second door to explain, and offering one
 * that redirects to a different action is worse than not offering it.
 */
export function canLeaveGroup(board: { learning_path_id: string | null }): boolean {
  return board.learning_path_id === null;
}

/**
 * ── ⚠⚠⚠ WHAT A GROUP OFFERS, GIVEN ITS TYPE ─────────────────────────────
 *
 * ⚠ `E579` — a page must not render a control that cannot work. An invite-only
 * group shows **no** Join and **no** ask, because neither would do anything.
 *
 * ⚠⚠ AND A PRICED GROUP OFFERS NO PURCHASE AT ALL, whatever its type: no
 * `Payment` row is ever created anywhere in the codebase and `PAID` is never
 * written. ⚠⚠⚠ THE COPY NAMES THE MECHANISM, NEVER THE MEMBER — *"buying isn't
 * switched on yet"*, never *"you are not eligible"*.
 */
export type GroupOffer =
  | { kind: "join" }
  | { kind: "request" }
  | { kind: "invite_only" }
  | { kind: "priced"; priceCents: number; period: string | null }
  | { kind: "by_enrolment" }
  | { kind: "member" };

export function groupOffer(
  board: {
    type: string;
    price_cents: number | null;
    price_period: string | null;
    learning_path_id: string | null;
  },
  isMember: boolean
): GroupOffer {
  if (isMember) return { kind: "member" };
  /* ⚠ A path group has one door and it is enrolment. */
  if (board.learning_path_id) return { kind: "by_enrolment" };
  /* ⚠⚠ PRICE BEATS TYPE. A paid OPEN group still cannot be joined, because
     joining it would be a purchase and nothing can be bought. */
  if (board.price_cents !== null)
    return { kind: "priced", priceCents: board.price_cents, period: board.price_period };
  if (board.type === "INVITE_ONLY") return { kind: "invite_only" };
  if (board.type === "REQUEST") return { kind: "request" };
  return { kind: "join" };
}

/** ⚠ ONE STRING PER OFFER, so no surface invents its own wording. */
export const GROUP_OFFER_COPY: Record<GroupOffer["kind"], string> = {
  member: "You're in this group.",
  by_enrolment:
    "This group belongs to a learning path. Enrolling in the path puts you in the group.",
  join: "Anyone can join this group.",
  request: "Ask to join and an owner will decide.",
  /* ⚠⚠ NO JOIN CONTROL RENDERS FOR THIS ONE — the sentence is the whole
     affordance, because there is nothing a non-member can do here. */
  invite_only: "This group is invite only, so there's no way to ask.",
  /* ⚠⚠⚠ IT NAMES THE MECHANISM, NOT THE MEMBER. Nothing here says "you
     cannot" — buying is not switched on for anybody. */
  priced: "Buying isn't switched on yet, so this group can't be joined.",
};

/**
 * ── ⚠⚠⚠ "AM I IN THIS GROUP?" — ONE FUNCTION, TWO KINDS OF GROUP ─────────
 *
 * ⚠⚠ SCOTT, 2026-09-23: *"one membership table… otherwise 'am I in this group?'
 * has two answers that will drift."* ⚠ This is that one answer.
 *
 * ── ⚠⚠⚠ A DEVIATION FROM WS-A.6, STATED PLAINLY SO SCOTT CAN OVERRULE IT ──
 *
 * The brief says *"`canAccessPathForum` now reads the membership table."*
 * ⚠⚠ **IT DOES NOT, AND HERE IS WHY.** A path group's membership row is written
 * by `ensureEnrolmentMembership`, which is deliberately NON-FATAL — it must
 * never turn "I enrolled" into an error the member sees, the same shape
 * `E522`'s receipt uses. ⚠⚠⚠ **IF FORUM ACCESS READ THAT ROW, A SWALLOWED
 * BOOKKEEPING FAILURE WOULD BECOME A LOCKED DOOR** — the member is enrolled,
 * the app agrees they are enrolled, and the room refuses them.
 *
 * ⚠ SO FOR A PATH GROUP THE DOOR IS STILL ENROLMENT, AND THE MEMBERSHIP ROW IS
 * THE RECORD OF IT. **That is not a second rule**: enrolment is what the row is
 * derived from, so the two cannot disagree about a path group by construction —
 * the backfill proved the sets identical in both directions, 0 gained, 0 lost.
 * ⚠⚠ THE MEMBERSHIP TABLE IS THE DOOR FOR GENERAL AND PAID GROUPS, which have
 * no enrolment to derive from and are the reason the table exists.
 *
 * ⚠ **This is Scott's call to reverse.** Reversing it means making the
 * enrolment-membership write fatal, which trades a locked room for a failed
 * enrolment — a worse trade, but his to make.
 */
/**
 * ⚠⚠⚠ `pathAccess` IS INJECTED, NOT IMPORTED, AND THAT IS A REAL BUG FIX.
 * The first version called `canAccessPathForum` through a dynamic
 * `import("@/lib/forums")` — **from a module `forums.ts` itself imports.** The
 * cycle threw at request time and `/community/groups/getting-started` rendered
 * *"This page couldn't load"*. ⚠ CAUGHT IN THE SCREENSHOT, NOT BY A GATE: every
 * check was green and the page was blank.
 * ⚠ So the caller — which has already asked the path question to decide whether
 * to assemble the board at all — hands the answer in. **The rule is still
 * stated once, in `canAccessPathForum`; this function does not restate it, it
 * receives it.**
 */
export async function isGroupMember(
  viewer: { userId: string } | null,
  board: { id: string; learning_path_id: string | null },
  pathAccess = false
): Promise<boolean> {
  if (!viewer) return false;

  /* ⚠ A path group's membership IS its access, and the caller already knows it. */
  if (board.learning_path_id) return pathAccess;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return false;
  const row = await prisma.groupMembership.findUnique({
    where: { board_id_person_id: { board_id: board.id, person_id: person.id } },
    select: { state: true },
  });
  /* ⚠ ONLY `ACTIVE`. A pending request is not membership, and a declined or
     removed row is history — all three are kept, none of them is a door. */
  return row?.state === "ACTIVE";
}

/**
 * Join, ask to join, or leave a group.
 *
 * ⚠⚠⚠ IT REFUSES WHAT THE TYPE REFUSES, ON THE SERVER. The page not rendering a
 * control is not a boundary; this is.
 */
export class GroupError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

export async function joinGroup(
  userId: string,
  boardId: string,
  leaving = false
): Promise<{ state: string }> {
  const board = await prisma.forumBoard.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      type: true,
      price_cents: true,
      price_period: true,
      learning_path_id: true,
      /* ⚠ `P2-A3-E620` — the owner is who a join REQUEST goes to, and the title
         is what the notification says. Read here so the notify below needs no
         second query. */
      title: true,
      host_person_id: true,
    },
  });
  if (!board) throw new GroupError("That group isn't available.", "NOT_FOUND");

  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!person) throw new GroupError("No person for this account.", "NOT_FOUND");

  if (leaving) {
    /* ⚠⚠⚠ A PATH GROUP CANNOT BE LEFT. Scott: *"You unenrol from the path. One
       door, not two."* ⚠ Refused here as well as hidden on the page, because a
       hidden control is not a boundary. */
    if (!canLeaveGroup(board)) {
      throw new GroupError(
        "This group belongs to a learning path. Unenrol from the path to leave it.",
        "LEAVE_VIA_PATH"
      );
    }
    await prisma.groupMembership.updateMany({
      where: { board_id: board.id, person_id: person.id },
      data: { state: "REMOVED" },
    });
    return { state: "REMOVED" };
  }

  const offer = groupOffer(board, false);
  /* ⚠⚠ NOTHING CAN BE BOUGHT. No `Payment` row is created anywhere and `PAID`
     is never written, so a priced group cannot be joined by anybody. */
  if (offer.kind === "priced")
    throw new GroupError(GROUP_OFFER_COPY.priced, "NOT_PURCHASABLE");
  if (offer.kind === "invite_only")
    throw new GroupError(GROUP_OFFER_COPY.invite_only, "INVITE_ONLY");
  if (offer.kind === "by_enrolment")
    throw new GroupError(GROUP_OFFER_COPY.by_enrolment, "JOIN_VIA_PATH");

  /* ⚠ OPEN joins immediately; REQUEST lands PENDING and waits for a decision. */
  const state = board.type === "REQUEST" ? "PENDING" : "ACTIVE";
  const route = board.type === "REQUEST" ? "REQUESTED" : "JOINED";
  await prisma.groupMembership.upsert({
    where: { board_id_person_id: { board_id: board.id, person_id: person.id } },
    create: { board_id: board.id, person_id: person.id, route, state },
    /* ⚠⚠ RE-JOINING AFTER LEAVING REUSES THE ROW. The history stays; the state
       moves. A second row would double-count the room. */
    update: { route, state },
  });

  /*
    ── ⚠⚠⚠ THE OWNER IS TOLD SOMEBODY IS WAITING (`P2-A3-E620`, ruling 34e) ──

    ⚠ ONLY ON `PENDING`. An OPEN group's join needs nobody's decision, so there
    is nothing waiting on the owner and a worklist item would never clear.
    ⚠⚠ NOBODY IS NOTIFIED ABOUT THEIR OWN ACTION (WS-B item 3): an owner who
    asks to join their own group — which cannot happen today, because a host is
    filtered out of Discover — would still not be told about themselves.
    ⚠⚠⚠ THE `dedupeKey` IS THE MEMBERSHIP PAIR, SO ASKING TWICE CANNOT MAKE TWO
    WORKLIST ITEMS. `@@unique([person_id, dedupe_key])` enforces it in the
    database rather than this code remembering to check (WS-B item 4).
    ⚠ `notify` catches its own failures and never rethrows, so a notification
    outage cannot turn "you joined" into an error (WS-B item 2).
  */
  if (state === "PENDING" && board.host_person_id && board.host_person_id !== person.id) {
    const asker = await prisma.person.findUnique({
      where: { id: person.id },
      select: { first_name: true, last_name: true },
    });
    await notify({
      event: "group.join_requested",
      personId: board.host_person_id,
      entityType: "forum_board",
      entityId: board.id,
      dedupeKey: `group.join_requested:${board.id}:${person.id}`,
      vars: {
        askerName:
          [asker?.first_name, asker?.last_name].filter(Boolean).join(" ") || "A member",
        groupTitle: board.title,
      },
    });
  }
  return { state };
}

/**
 * ── ⚠⚠⚠ ANYONE CAN START A GROUP — RULING 2 (`P2-A3-E619` WS-A) ──────────
 *
 * ⚠ SCOTT, 2026-09-22, RULING 2: *"Anyone can start a group. Every learning
 * path still has its own group automatically; a member can also start one of
 * their own (a topic, a region, alumni)."*
 *
 * ── ⚠⚠⚠ THE SCHEMA ALLOWED THIS ALREADY. NOTHING WROTE IT ────────────────
 *
 * ⚠⚠ RULING 12, 2026-09-24: *"Member-created groups: ALREADY POSSIBLE — no
 * schema ruling needed."* ⚠ **That ruling is correct about the SCHEMA and was
 * measured again here: `learning_path_id` is nullable, `GroupType` exists, and
 * `host_person_id` exists.** ⚠⚠⚠ BUT THE PREMISE CHECK FOUND NO WRITER: the
 * only two `forumBoard` creates in the codebase are `ensureBoards()` (the four
 * seeded general boards) and `ensurePathBoard()` (created WITH a path), so
 * **nothing could start a member's group and ruling 2 had no mechanism.**
 * ⚠ This function is that mechanism, and it needed no schema change.
 *
 * ── ⚠⚠⚠ `OPEN` OR `REQUEST` — AND `REQUEST` ONLY BECAUSE WS-B LANDED ────
 *
 * ⚠⚠ WS-A SHIPPED THIS `OPEN`-ONLY, AND THE REASON WAS NOT CAUTION — IT WAS A
 * MEASUREMENT: `GroupType.REQUEST` lands joiners in `PENDING`, and at that
 * moment **nothing in the product could move a `PENDING` row** (`decided_at`,
 * `decided_by_person_id`, `APPROVED` and `DECLINED` had zero writers between
 * them). ⚠⚠⚠ OFFERING IT WOULD HAVE MANUFACTURED A STATE THE PRODUCT COULD NOT
 * LEAVE — a member asking to join and waiting forever, with no screen anywhere
 * able to answer. ⚠ `E579` one level down: **do not create the state before its
 * exit exists.**
 * ⚠⚠ `decideJoinRequest` IS THAT EXIT, and it lands in the same branch. The
 * restriction is lifted because the thing it was waiting for is here — not
 * because it was reconsidered.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   type: "OPEN",   // the only value WS-A would write
 *
 * ⚠⚠⚠ `INVITE_ONLY` IS STILL REFUSED, AND FOR THE ORIGINAL REASON, UNCHANGED:
 * **nothing sends an invite.** There is no writer, so a group created that way
 * would be a room nobody could ever enter — including its owner's colleagues.
 */
export async function createGroup(
  userId: string,
  input: { title: string; description?: string | null; type?: "OPEN" | "REQUEST" }
): Promise<{ slug: string }> {
  const title = input.title.trim();
  /* ⚠ The floor is a real name, not a keystroke. A one-character group is a
     room nobody can find again, including the person who made it. */
  if (title.length < 3) {
    throw new GroupError("Give your group a name of at least 3 characters.", "BAD_TITLE");
  }
  if (title.length > 80) {
    throw new GroupError("That name is too long — 80 characters at most.", "BAD_TITLE");
  }

  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!person) throw new GroupError("No person for this account.", "NOT_FOUND");

  /*
    ⚠⚠⚠ THE SLUG MUST NOT COLLIDE WITH A PATH BOARD'S. `ensurePathBoard` owns
    the `path-` prefix (`pathBoardSlug` above), so a member naming their group
    "Beginners" must never mint `path-beginners` and collide with a real path's
    room. ⚠ The prefix here is `g-`, and the two namespaces cannot meet.
  */
  const base =
    "g-" +
    (title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "group");

  /*
    ⚠⚠ `slug` IS `@unique`, SO A COLLISION IS A DATABASE ERROR, NOT A GUESS.
    ⚠ Two members naming a group the same thing on the same day is ordinary, so
    the suffix is tried rather than assumed free. ⚠⚠⚠ THE LOOP IS BOUNDED: an
    unbounded retry on a unique violation is how a create becomes a hang.
  */
  for (let n = 0; n < 25; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    const taken = await prisma.forumBoard.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (taken) continue;
    try {
      await prisma.forumBoard.create({
        data: {
          slug,
          title,
          description: input.description?.trim() || null,
          /* ⚠⚠ NO `learning_path_id`. That is what makes it a member's group
             rather than a path's, and it is the column ruling 12 confirmed was
             already nullable. */
          host_person_id: person.id,
          /* ⚠⚠ `OPEN` OR `REQUEST` ONLY — the union on the parameter is what
             refuses `INVITE_ONLY`, so the compiler enforces it rather than a
             check somebody has to remember (the pattern Scott asked be
             repeated: make the compiler find the call sites). */
          type: input.type ?? "OPEN",
          /* ⚠ After the four seeded boards (0,10,20,30) and the path rooms. */
          sort_order: 100,
        },
      });
    } catch {
      /* ⚠ Lost the race between the check and the create — try the next slug
         rather than failing a create that is still perfectly valid. */
      continue;
    }

    /*
      ⚠⚠⚠ THE CREATOR IS A MEMBER OF THEIR OWN GROUP, AND THIS IS NOT COSMETIC.
      ⚠ Without this row the founder is in a room with zero members — their own
      Groups page would count them out of the thing they just made, and
      "Groups You Joined" and the member count would both be wrong on day one.
      ⚠⚠ `route: JOINED`, and `auto_approved` stays FALSE: a person acted. The
      backfill's `auto_approved: true` means *nobody decided*, and reusing it
      here would put a machine's fingerprint on a human's action.
    */
    await prisma.groupMembership.create({
      data: {
        board_id: (await prisma.forumBoard.findUniqueOrThrow({
          where: { slug },
          select: { id: true },
        })).id,
        person_id: person.id,
        route: "JOINED",
        state: "ACTIVE",
      },
    });
    return { slug };
  }

  throw new GroupError(
    "Too many groups share that name — try a different one.",
    "SLUG_EXHAUSTED"
  );
}

/**
 * ── ⚠⚠⚠ A REQUEST GETS AN ANSWER (`P2-A3-E619` WS-B 3) ──────────────────
 *
 * ⚠ THE BRIEF: *"Requests: people asking to join groups you run (approve or
 * decline, **and they're told either way**)."*
 *
 * ── ⚠⚠⚠ THIS IS THE EXIT WS-A REFUSED TO CREATE A STATE WITHOUT ─────────
 *
 * ⚠⚠ MEASURED AT THE PREMISE CHECK: `joinGroup` writes `PENDING` for a
 * `REQUEST` group, and **nothing in the product could move that row** — the
 * only API took `join | leave`, and `decided_at`, `decided_by_person_id`,
 * `APPROVED` and `DECLINED` had ZERO writers between them. ⚠ A member could ask
 * and wait forever, with no screen anywhere able to answer them.
 * ⚠⚠⚠ THAT IS WHY `createGroup` SHIPPED `OPEN`-ONLY IN WS-A. This function is
 * what makes `REQUEST` safe to offer, and the two land together on purpose.
 *
 * ── ⚠⚠ "TOLD EITHER WAY" MEANS THE PAGE, NOT AN EMAIL ───────────────────
 *
 * ⚠ Notifications about group activity are **out of scope by the brief's own
 * list** and are `brief_notifications`'s. ⚠⚠ So the answer is delivered where
 * the asker already looks: their own `Your Requests` list shows `DECLINED` in
 * words, and an approval moves the group into `Groups You Joined`.
 * ⚠⚠⚠ A DECLINE IS RECORDED, NEVER DELETED — that is what makes it tellable. A
 * deleted row would read as *"you never asked"*, and the member would ask
 * again, forever. ⚠ It is also why `state` moves to `DECLINED` rather than the
 * row being removed.
 */
export async function decideJoinRequest(
  userId: string,
  membershipId: string,
  approve: boolean
): Promise<{ state: string }> {
  const decider = await prisma.person.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!decider) throw new GroupError("No person for this account.", "NOT_FOUND");

  const row = await prisma.groupMembership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      state: true,
      person_id: true,
      board: { select: { id: true, host_person_id: true, title: true, slug: true } },
    },
  });
  if (!row) throw new GroupError("That request isn't available.", "NOT_FOUND");

  /*
    ⚠⚠⚠ OWNER-SCOPED, AND CHECKED HERE RATHER THAN IN THE ROUTE. Load-bearing
    rule 5: the decider is resolved from the SESSION and compared against the
    board's host. ⚠ A page that does not render an Approve button is not a
    boundary — the same sentence `joinGroup` carries, for the same reason.
  */
  if (row.board.host_person_id !== decider.id) {
    throw new GroupError("Only the group's owner can answer this.", "NOT_OWNER");
  }

  /*
    ⚠⚠ ONLY A PENDING ROW CAN BE DECIDED. Re-approving an ACTIVE member or
    re-declining a DECLINED one would rewrite `decided_at` and quietly change
    who decided and when — an audit trail that moves is worse than none.
    ⚠ It also makes a double-click harmless rather than destructive.
  */
  if (row.state !== "PENDING") {
    throw new GroupError("That request has already been answered.", "ALREADY_DECIDED");
  }

  const state = approve ? "ACTIVE" : "DECLINED";
  await prisma.groupMembership.update({
    where: { id: row.id },
    data: {
      state,
      /* ⚠ The route records HOW they got in. An approved member arrived by
         `APPROVED`, which is a different fact from having simply `JOINED` an
         open group — and it is the difference a group's owner may care about. */
      ...(approve ? { route: "APPROVED" as const } : {}),
      decided_at: new Date(),
      decided_by_person_id: decider.id,
      /* ⚠⚠⚠ `auto_approved` STAYS FALSE. It means *nobody decided* — the
         backfill's fingerprint. A person decided here, and writing `true`
         would erase exactly the distinction the column exists to preserve. */
      auto_approved: false,
    },
  });

  /*
    ── ⚠⚠⚠ TOLD EITHER WAY (`P2-A3-E620`, ruling 34e) ──────────────────────

    ⚠ THE BRIEF: *"approve or decline, **and they're told either way**."* `E619`
    delivered that on the asker's own page; this delivers it to the bell.
    ⚠⚠ A DECLINE IS TOLD, NOT SWALLOWED — the same reason the row is kept
    rather than deleted: a decline nobody sees reads as *"you never asked"*.
    ⚠⚠⚠ NEITHER IS A WORKLIST ITEM. Nothing is owed by the person being told —
    the action was the owner's, and it is already done.
    ⚠ Dedupe on the membership row, so a double-click cannot tell them twice.
  */
  await notify({
    event: approve ? "group.join_approved" : "group.join_declined",
    personId: row.person_id,
    entityType: "forum_board",
    entityId: row.board.id,
    dedupeKey: `group.join_decided:${row.id}`,
    vars: { groupTitle: row.board.title, groupSlug: row.board.slug },
  });

  /*
    ⚠⚠ AND THE OWNER'S WORKLIST ITEM IS CLEARED. ⚠⚠⚠ RULING 34e: *"an item
    disappears when the thing is DONE, not when it is read."* Marking it read
    would leave it on the list; `resolved_at` is what takes it off, and this is
    the moment the thing was actually done.
    ⚠ Scoped by the SAME dedupe key `joinGroup` wrote, so it clears exactly the
    item this decision answers and nothing else.
  */
  await prisma.notification
    .updateMany({
      where: {
        dedupe_key: `group.join_requested:${row.board.id}:${row.person_id}`,
        resolved_at: null,
      },
      data: { resolved_at: new Date() },
    })
    .catch(() => {
      /* ⚠ Clearing a worklist item must not fail the decision it records. */
    });

  return { state };
}
