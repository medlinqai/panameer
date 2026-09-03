import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

/**
 * MY COMMUNITY — the part that connects people (`P1-ALL-E372`).
 *
 * **SCOTT, 2026-09-03:** *"how can you promote commerce without facilitating the
 * connection of people to do that trading/commerce? This section CONNECTS
 * people."* And on sequencing: *"learn needs colleagues and forums to work to get
 * it all tested."* ⚠ THAT IS WHY THIS RUNS BEFORE THE REST OF LEARN — the LEARN
 * journey notifies *"colleagues you are connected to"*, and none can be tested
 * until colleagues exist.
 *
 * ── ⚠⚠ TWO SHAPES, AND THEY BEHAVE DIFFERENTLY ON CREATION ───────────────────
 *
 *   COLLEAGUE  created `PENDING`. Mutual — the other side must accept.
 *   MENTOR     created `ACCEPTED`. One-way. ⚠ FOLLOWING REQUIRES NO PERMISSION,
 *              and asking for one would make it a different feature.
 *
 * ⚠ THEY MUST NOT COLLAPSE INTO ONE GENERIC "CONNECTION". `check:community`
 * asserts a `MENTOR` row is never `PENDING` and a `COLLEAGUE` is never
 * `ACCEPTED` without a `responded_at`.
 *
 * ── ⚠⚠ `DECLINED` IS A STATE, NOT A DELETE. NOTHING HERE DELETES A ROW ───────
 *
 * `P1-ALL-E369`'s growth strategy rests on a colleague request meaning *"I vouch
 * for this person"*. A decline is the true signal that protects that, and an
 * invite with no graceful no is how a network fills with noise. A declined row
 * also stops the same request being re-sent forever.
 *
 * ── ⚠ WHAT THIS FILE DELIBERATELY DOES NOT DO ────────────────────────────────
 *
 * No invites to non-members, no email, no thank-yous, no credit awards. Email
 * cannot send — `RESEND_API_KEY` is commented out at `.env.local:21`, there is no
 * digest sender, and nothing fires a digest event (`P1-ALL-E371`). ⚠ AND NO
 * INVITE BUTTON IS STUBBED: a dead invite makes a member think they vouched for
 * somebody who never heard.
 */

export type ConnectionKindValue = "COLLEAGUE" | "MENTOR";
export type ConnectionStatusValue = "PENDING" | "ACCEPTED" | "DECLINED";

/** ⚠ EXACTLY TWO. `TEAM` is not folded in — see the schema note. */
export const CONNECTION_KINDS: ConnectionKindValue[] = ["COLLEAGUE", "MENTOR"];

export class ConnectionError extends Error {
  constructor(
    message: string,
    public code: "SELF" | "NOT_FOUND" | "ALREADY" | "NOT_A_MEMBER" | "WRONG_KIND"
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}

/** Resolve the viewer's own user id. ⚠ Fails closed. */
async function ownUserId(viewer: Viewer): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { id: true },
  });
  if (!u) throw new ConnectionError("No account for this session", "NOT_FOUND");
  return u.id;
}

/**
 * ⚠⚠ NO SELF-CONNECTION, ASSERTED IN THE LIB AND NOT ONLY IN THE UI. A search
 * result that hides your own row is a courtesy; this is the rule, and the API is
 * reachable without the page.
 */
function refuseSelf(from: string, to: string) {
  if (from === to) {
    throw new ConnectionError("You can't connect to yourself", "SELF");
  }
}

/**
 * COLLEAGUE — one click, `PENDING`, mutual.
 *
 * ⚠ IDEMPOTENT ON RE-SEND: an existing row in ANY state is returned unchanged
 * rather than reset. ⚠⚠ THAT IS WHAT MAKES `DECLINED` MEAN SOMETHING — without
 * it, a declined request could be re-sent forever and the decline would be
 * decoration.
 */
export async function requestColleague(viewer: Viewer, toUserId: string) {
  const from = await ownUserId(viewer);
  refuseSelf(from, toUserId);

  /* ⚠ THE TARGET MUST BE A REAL MEMBER. This brief connects people who are
     already here; inviting a non-member needs the mail pipe. */
  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) throw new ConnectionError("That person isn't on Panameer", "NOT_A_MEMBER");

  const existing = await prisma.connection.findUnique({
    where: {
      from_user_id_to_user_id_kind: {
        from_user_id: from,
        to_user_id: toUserId,
        kind: "COLLEAGUE",
      },
    },
  });
  if (existing) return existing;

  /*
    ⚠ AND IF THEY ALREADY ASKED YOU, ACCEPTING IS THE RIGHT ANSWER — not a second
    row pointing the other way. Two PENDING rows between the same pair would be
    two requests nobody can resolve.
  */
  const reverse = await prisma.connection.findUnique({
    where: {
      from_user_id_to_user_id_kind: {
        from_user_id: toUserId,
        to_user_id: from,
        kind: "COLLEAGUE",
      },
    },
  });
  if (reverse && reverse.status === "PENDING") {
    return prisma.connection.update({
      where: { id: reverse.id },
      data: { status: "ACCEPTED", responded_at: new Date() },
    });
  }
  if (reverse) return reverse;

  return prisma.connection.create({
    data: { from_user_id: from, to_user_id: toUserId, kind: "COLLEAGUE", status: "PENDING" },
  });
}

/**
 * MENTOR — one click, `ACCEPTED` immediately.
 *
 * ⚠⚠ THE LABEL IS **FOLLOW**, NOT ADD, and the survey is why: `lib/mentors.ts`
 * is a directory of ELIGIBLE providers, and its own header says *"there is no
 * `MentorProfile`, so nobody has OPTED IN to mentoring"*. So this row means
 * **"I follow this person"** — it does NOT mean they agreed to mentor anybody,
 * and it must never be rendered as if it did.
 * ⚠ FOLLOWING AND BOOKING ARE TWO DIFFERENT ACTIONS ON THE SAME PERSON. This
 * touches neither `MICRO_SESSION_PRICE` nor any booking path; both survive
 * independently.
 */
export async function followMentor(viewer: Viewer, toUserId: string) {
  const from = await ownUserId(viewer);
  refuseSelf(from, toUserId);

  const target = await prisma.user.findUnique({ where: { id: toUserId }, select: { id: true } });
  if (!target) throw new ConnectionError("That person isn't on Panameer", "NOT_A_MEMBER");

  const existing = await prisma.connection.findUnique({
    where: {
      from_user_id_to_user_id_kind: { from_user_id: from, to_user_id: toUserId, kind: "MENTOR" },
    },
  });
  if (existing) return existing;

  /* ⚠ `responded_at` IS SET AT CREATION. There was a response — it is "none
     needed" — and leaving it null would make an ACCEPTED row indistinguishable
     from a colleague row that skipped acceptance. */
  return prisma.connection.create({
    data: {
      from_user_id: from,
      to_user_id: toUserId,
      kind: "MENTOR",
      status: "ACCEPTED",
      responded_at: new Date(),
    },
  });
}

/** ⚠ Unfollowing DOES delete — a follow is not a claim about the other person,
    so there is nothing to preserve. ⚠ CONTRAST `declineColleague`, which never
    deletes, because a decline IS a claim. */
export async function unfollowMentor(viewer: Viewer, toUserId: string) {
  const from = await ownUserId(viewer);
  await prisma.connection.deleteMany({
    where: { from_user_id: from, to_user_id: toUserId, kind: "MENTOR" },
  });
}

/** Accept a colleague request addressed to me. ⚠ Only the RECIPIENT may. */
export async function acceptColleague(viewer: Viewer, connectionId: string) {
  const me = await ownUserId(viewer);
  const row = await prisma.connection.findFirst({
    where: { id: connectionId, to_user_id: me, kind: "COLLEAGUE", status: "PENDING" },
    select: { id: true },
  });
  if (!row) throw new ConnectionError("That request is no longer open", "NOT_FOUND");
  return prisma.connection.update({
    where: { id: row.id },
    /* ⚠ `responded_at` IS NOT OPTIONAL HERE — the harness fails the build if an
       ACCEPTED colleague row lacks one. */
    data: { status: "ACCEPTED", responded_at: new Date() },
  });
}

/**
 * Decline one. ⚠⚠ IT UPDATES, IT NEVER DELETES.
 *
 * Scott's growth strategy treats a request as *"I vouch for this person"*, so the
 * decline is the signal that keeps the vouch honest. Deleting the row would throw
 * that away AND let the same request arrive again tomorrow.
 */
export async function declineColleague(viewer: Viewer, connectionId: string) {
  const me = await ownUserId(viewer);
  const row = await prisma.connection.findFirst({
    where: { id: connectionId, to_user_id: me, kind: "COLLEAGUE", status: "PENDING" },
    select: { id: true },
  });
  if (!row) throw new ConnectionError("That request is no longer open", "NOT_FOUND");
  return prisma.connection.update({
    where: { id: row.id },
    data: { status: "DECLINED", responded_at: new Date() },
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   READS
   ──────────────────────────────────────────────────────────────────────────── */

export type PersonCard = {
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  company: string | null;
};

const personSelect = {
  id: true,
  first_name: true,
  last_name: true,
  title: true,
  photo_url: true,
  company: { select: { name: true } },
  user: { select: { id: true } },
} as const;

type PersonRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  photo_url: string | null;
  company: { name: string } | null;
  user: { id: string } | null;
};

const toCard = (p: PersonRow): PersonCard => ({
  userId: p.user?.id ?? "",
  personId: p.id,
  name: `${p.first_name} ${p.last_name}`.trim(),
  title: p.title,
  photoUrl: p.photo_url,
  company: p.company?.name ?? null,
});

/**
 * Search members by name, company or title.
 *
 * ⚠ ONLY PEOPLE WITH A LOGIN. A `Person` with no `user_id` cannot receive a
 * request, so offering them would be an add that goes nowhere.
 * ⚠ AND NEVER YOURSELF — the lib refuses it anyway, but a search result you
 * cannot act on is noise.
 */
export async function searchMembers(
  viewer: Viewer,
  query: string,
  take = 20
): Promise<(PersonCard & { relation: ConnectionStatusValue | "FOLLOWING" | null })[]> {
  const me = await ownUserId(viewer);
  const q = query.trim();
  if (q.length < 2) return [];

  const rows = await prisma.person.findMany({
    where: {
      user: { isNot: null, is: { id: { not: me } } },
      OR: [
        { first_name: { contains: q, mode: "insensitive" } },
        { last_name: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: personSelect,
    take,
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
  });

  const ids = rows.map((r) => r.user?.id).filter(Boolean) as string[];
  const mine = await prisma.connection.findMany({
    where: {
      OR: [
        { from_user_id: me, to_user_id: { in: ids } },
        { to_user_id: me, from_user_id: { in: ids } },
      ],
    },
  });

  return rows.map((r) => {
    const card = toCard(r);
    const rel = mine.find(
      (c) =>
        (c.from_user_id === card.userId || c.to_user_id === card.userId) &&
        c.kind === "COLLEAGUE"
    );
    const follows = mine.find(
      (c) => c.kind === "MENTOR" && c.from_user_id === me && c.to_user_id === card.userId
    );
    /* ⚠ THE ROW'S LABEL COMES FROM THE DATA, so it can read "Requested" rather
       than offering an add that would be a no-op. */
    return {
      ...card,
      relation: rel ? (rel.status as ConnectionStatusValue) : follows ? "FOLLOWING" : null,
    };
  });
}

/** My colleagues, my pending requests in both directions, and who I follow. */
export async function getMyCommunity(viewer: Viewer) {
  const me = await ownUserId(viewer);
  const rows = await prisma.connection.findMany({
    where: { OR: [{ from_user_id: me }, { to_user_id: me }] },
    orderBy: { created_at: "desc" },
  });

  const otherIds = [
    ...new Set(rows.map((r) => (r.from_user_id === me ? r.to_user_id : r.from_user_id))),
  ];
  const people = await prisma.person.findMany({
    where: { user: { is: { id: { in: otherIds } } } },
    select: personSelect,
  });
  const byUser = new Map(people.filter((p) => p.user).map((p) => [p.user!.id, toCard(p)]));
  const other = (r: { from_user_id: string; to_user_id: string }) =>
    byUser.get(r.from_user_id === me ? r.to_user_id : r.from_user_id);

  return {
    colleagues: rows
      .filter((r) => r.kind === "COLLEAGUE" && r.status === "ACCEPTED")
      .map((r) => ({ connectionId: r.id, person: other(r) }))
      .filter((x) => x.person),
    /** Requests waiting on ME. ⚠ The only list with Accept / Decline on it. */
    incoming: rows
      .filter((r) => r.kind === "COLLEAGUE" && r.status === "PENDING" && r.to_user_id === me)
      .map((r) => ({ connectionId: r.id, person: other(r) }))
      .filter((x) => x.person),
    /** Requests I sent that are still open. No action — it is their turn. */
    outgoing: rows
      .filter((r) => r.kind === "COLLEAGUE" && r.status === "PENDING" && r.from_user_id === me)
      .map((r) => ({ connectionId: r.id, person: other(r) }))
      .filter((x) => x.person),
    following: rows
      .filter((r) => r.kind === "MENTOR" && r.from_user_id === me)
      .map((r) => ({ connectionId: r.id, person: other(r) }))
      .filter((x) => x.person),
    /*
      ⚠ DECLINED ROWS ARE COUNTED, NOT LISTED. They are kept forever and they
      stop a re-send, but putting "3 people said no" on somebody's own page would
      be cruelty with no purpose. The count exists so the number is auditable.
    */
    declinedCount: rows.filter((r) => r.kind === "COLLEAGUE" && r.status === "DECLINED").length,
  };
}
