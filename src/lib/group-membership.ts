import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

export const pathBoardSlug = (pathSlug: string) => `path-${pathSlug}`;

/** Enrolling in a path puts the member in that path's group. */
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
    // A user with no Person, or a path with no board, is not an error here —
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
      // RE-ENROLLING RE-ACTIVATES, IT DOES NOT RE-CREATE. Somebody who left
      update: { state: "ACTIVE" },
    });
  } catch (err) {
    /* RECORDED, NOT SILENT (`E516` — a thrown call must not produce silence). */
    console.error("[group-membership] enrolment membership not recorded", err);
  }
}

/** Leaving a path takes the member out of its group. */
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

/** CAN THIS GROUP BE LEFT AT ALL? */
export function canLeaveGroup(board: { learning_path_id: string | null }): boolean {
  return board.learning_path_id === null;
}

/** WHAT A GROUP OFFERS, GIVEN ITS TYPE */
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
  /* A path group has one door and it is enrolment. */
  if (board.learning_path_id) return { kind: "by_enrolment" };
  // PRICE BEATS TYPE. A paid OPEN group still cannot be joined, because
  if (board.price_cents !== null)
    return { kind: "priced", priceCents: board.price_cents, period: board.price_period };
  if (board.type === "INVITE_ONLY") return { kind: "invite_only" };
  if (board.type === "REQUEST") return { kind: "request" };
  return { kind: "join" };
}

/** ONE STRING PER OFFER, so no surface invents its own wording. */
export const GROUP_OFFER_COPY: Record<GroupOffer["kind"], string> = {
  member: "You're in this group.",
  by_enrolment:
    "This group belongs to a learning path. Enrolling in the path puts you in the group.",
  join: "Anyone can join this group.",
  request: "Ask to join and an owner will decide.",
  // NO JOIN CONTROL RENDERS FOR THIS ONE — the sentence is the whole
  invite_only: "This group is invite only, so there's no way to ask.",
  // IT NAMES THE MECHANISM, NOT THE MEMBER. Nothing here says "you
  priced: "Buying isn't switched on yet, so this group can't be joined.",
};

/** SCOTT, 2026-09-23: *"one membership table… otherwise 'am I in this group?' */
/** The first version called `canAccessPathForum` through a dynamic */
export async function isGroupMember(
  viewer: { userId: string } | null,
  board: { id: string; learning_path_id: string | null },
  pathAccess = false
): Promise<boolean> {
  if (!viewer) return false;

  /* A path group's membership IS its access, and the caller already knows it. */
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
  // ONLY `ACTIVE`. A pending request is not membership, and a declined or
  return row?.state === "ACTIVE";
}

/** Join, ask to join, or leave a group. */
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
      // — the owner is who a join REQUEST goes to, and the title
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
    // A PATH GROUP CANNOT BE LEFT. Scott: *"You unenrol from the path. One
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
  // NOTHING CAN BE BOUGHT. No `Payment` row is created anywhere and `PAID`
  if (offer.kind === "priced")
    throw new GroupError(GROUP_OFFER_COPY.priced, "NOT_PURCHASABLE");
  if (offer.kind === "invite_only")
    throw new GroupError(GROUP_OFFER_COPY.invite_only, "INVITE_ONLY");
  if (offer.kind === "by_enrolment")
    throw new GroupError(GROUP_OFFER_COPY.by_enrolment, "JOIN_VIA_PATH");

  /* OPEN joins immediately; REQUEST lands PENDING and waits for a decision. */
  const state = board.type === "REQUEST" ? "PENDING" : "ACTIVE";
  const route = board.type === "REQUEST" ? "REQUESTED" : "JOINED";
  await prisma.groupMembership.upsert({
    where: { board_id_person_id: { board_id: board.id, person_id: person.id } },
    create: { board_id: board.id, person_id: person.id, route, state },
    // RE-JOINING AFTER LEAVING REUSES THE ROW. The history stays; the state
    update: { route, state },
  });

  // THE OWNER IS TOLD SOMEBODY IS WAITING , ruling 34e)
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

/** ANYONE CAN START A GROUP — RULING 2 WS-A) */
export async function createGroup(
  userId: string,
  input: { title: string; description?: string | null; type?: "OPEN" | "REQUEST" }
): Promise<{ slug: string }> {
  const title = input.title.trim();
  // The floor is a real name, not a keystroke. A one-character group is a
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

  // THE SLUG MUST NOT COLLIDE WITH A PATH BOARD'S. `ensurePathBoard` owns
  const base =
    "g-" +
    (title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "group");

  // Two members naming a group the same thing on the same day is ordinary, so
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
          // NO `learning_path_id`. That is what makes it a member's group
          host_person_id: person.id,
          // refuses `INVITE_ONLY`, so the compiler enforces it rather than a
          type: input.type ?? "OPEN",
          /* After the four seeded boards (0,10,20,30) and the path rooms. */
          sort_order: 100,
        },
      });
    } catch {
      // Lost the race between the check and the create — try the next slug
      continue;
    }

    // THE CREATOR IS A MEMBER OF THEIR OWN GROUP, AND THIS IS NOT COSMETIC.
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

/** A REQUEST GETS AN ANSWER WS-B 3) */
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

  // OWNER-SCOPED, AND CHECKED HERE RATHER THAN IN THE ROUTE. Load-bearing
  if (row.board.host_person_id !== decider.id) {
    throw new GroupError("Only the group's owner can answer this.", "NOT_OWNER");
  }

  // ONLY A PENDING ROW CAN BE DECIDED. Re-approving an ACTIVE member or
  if (row.state !== "PENDING") {
    throw new GroupError("That request has already been answered.", "ALREADY_DECIDED");
  }

  const state = approve ? "ACTIVE" : "DECLINED";
  await prisma.groupMembership.update({
    where: { id: row.id },
    data: {
      state,
      // The route records HOW they got in. An approved member arrived by
      ...(approve ? { route: "APPROVED" as const } : {}),
      decided_at: new Date(),
      decided_by_person_id: decider.id,
      // backfill's fingerprint. A person decided here, and writing `true`
      auto_approved: false,
    },
  });

  // TOLD EITHER WAY , ruling 34e)
  await notify({
    event: approve ? "group.join_approved" : "group.join_declined",
    personId: row.person_id,
    entityType: "forum_board",
    entityId: row.board.id,
    dedupeKey: `group.join_decided:${row.id}`,
    vars: { groupTitle: row.board.title, groupSlug: row.board.slug },
  });

  // AND THE OWNER'S WORKLIST ITEM IS CLEARED. RULING 34e: *"an item
  await prisma.notification
    .updateMany({
      where: {
        dedupe_key: `group.join_requested:${row.board.id}:${row.person_id}`,
        resolved_at: null,
      },
      data: { resolved_at: new Date() },
    })
    .catch(() => {
      /* Clearing a worklist item must not fail the decision it records. */
    });

  return { state };
}
