import { prisma } from "@/lib/prisma";

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
    "This group belongs to a learning path. Enrolling in the path puts you in the room.",
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
 * cycle threw at request time and `/community/forums/getting-started` rendered
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
  return { state };
}
