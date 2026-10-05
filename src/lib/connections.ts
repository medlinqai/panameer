import { memberVisibleWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

export type ConnectionKindValue = "COLLEAGUE" | "MENTOR";
export type ConnectionStatusValue = "PENDING" | "ACCEPTED" | "DECLINED";

export const CONNECTION_KINDS: ConnectionKindValue[] = ["COLLEAGUE", "MENTOR"];

export class ConnectionError extends Error {
  constructor(
    message: string,
    public code:
      | "SELF"
      | "NOT_FOUND"
      | "ALREADY"
      | "NOT_A_MEMBER"
      | "WRONG_KIND"
      | "NOT_OPEN"
  ) {
    super(message);
    this.name = "ConnectionError";
  }
}

async function ownUserId(viewer: Viewer): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { id: true },
  });
  if (!u) throw new ConnectionError("No account for this session", "NOT_FOUND");
  return u.id;
}

function refuseSelf(from: string, to: string) {
  if (from === to) {
    throw new ConnectionError("You can't connect to yourself", "SELF");
  }
}

export async function requestColleague(viewer: Viewer, toUserId: string) {
  const from = await ownUserId(viewer);
  refuseSelf(from, toUserId);

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

  const created = await prisma.connection.create({
    data: { from_user_id: from, to_user_id: toUserId, kind: "COLLEAGUE", status: "PENDING" },
  });

  const inviter = await prisma.person.findFirst({
    where: { user_id: from },
    select: { first_name: true, last_name: true },
  });
  const invitee = await prisma.person.findFirst({
    where: { user_id: toUserId },
    select: { id: true },
  });
  if (invitee) {
    await notify({
      event: "colleague.invite_received",
      personId: invitee.id,
      entityType: "connection",
      entityId: created.id,
      dedupeKey: `colleague.invite:${created.id}`,
      vars: {
        fromName:
          [inviter?.first_name, inviter?.last_name].filter(Boolean).join(" ") || "Someone",
      },
    });
  }
  return created;
}

/**
 * ⚠⚠ CLEAR THE INVITE'S WORKLIST ITEM. Ruling 34e: *"an item disappears when
 * the thing is DONE, not when it is read."* ⚠ Accepting and declining both END
 * the wait, so both clear it — a decline that left the item standing would ask
 * the member to answer something they already answered.
 * ⚠⚠ It never throws into the caller: clearing a list item must not fail the
 * decision that was just recorded.
 */
async function clearInviteWorklist(connectionId: string) {
  await prisma.notification
    .updateMany({
      where: { dedupe_key: `colleague.invite:${connectionId}`, resolved_at: null },
      data: { resolved_at: new Date() },
    })
    .catch(() => {});
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

  /*
    ── ⚠⚠⚠ THE CONSENT IS ENFORCED HERE NOW, NOT ONLY DRAWN (`P2-A3-E721` item 3) ─────────

    ⚠ **SCOTT: *"followMentor must enforce `open_for_mentoring`. The UI respects it; the route
    doesn't."*** ⚠⚠ **MEASURED AT `E720` AND REPORTED THEN: this function read NOTHING about
    the target except that a `User` row existed**, so a hand-rolled POST could attach a mentee
    to any of the 63 providers, none of whom have ticked the box.
    ⚠⚠⚠ **`ProviderProfile.open_for_mentoring` (`schema.prisma:1102`) IS THE CONSENT** — its
    own docblock says *"THE CHECKBOX IS THE CONSENT"* and that it is WHY `ConnectionKind.MENTOR`
    needs no `PENDING` state. **A one-way row created `ACCEPTED` on the spot is only defensible
    if the target said yes in advance**; without this check, *"following requires no
    permission"* meant nobody's permission at all.
    ⚠ **THE SAME COLUMN THE UI READS, NOT A SECOND RULE (`E585`)** — `ConnectProfile` gates its
    section on `p.openForMentoring`, and `listMentors({ openOnly: true })` gates the directory,
    both on this field.

    ⚠⚠ **A TARGET WITH NO `ProviderProfile` IS REFUSED, AND THAT IS CORRECT RATHER THAN A GAP:**
    the flag lives on the provider profile, so a buyer has nowhere to express willingness and
    has therefore never expressed it. ⚠⚠⚠ **`getMentoringHome` ALREADY READS THAT CASE AS
    `null`, NEVER AS "OPEN"** (`mentoring-home.ts:95`), so refusing is the reading the rest of
    the codebase already takes.
    ⚠ **THE RELATION IS `person.providerProfile` (`@relation("ProfileOwner")`), CHECKED IN THE
    SCHEMA AND NOT GUESSED** — `Person` also carries `repProviderProfiles`
    (`"CoordinatorProviders"`), a LIST of profiles this person represents, and reading that one
    would have asked whether somebody's CLIENT accepts mentees.
  */
  const target = await prisma.user.findUnique({
    where: { id: toUserId },
    select: {
      id: true,
      person: { select: { providerProfile: { select: { open_for_mentoring: true } } } },
    },
  });
  if (!target) throw new ConnectionError("That person isn't on Panameer", "NOT_A_MEMBER");
  if (!target.person?.providerProfile?.open_for_mentoring) {
    /* ⚠⚠ ONE SENTENCE, DESCRIBING THE OTHER PERSON'S SETTING RATHER THAN BLAMING THE ASKER.
       ⚠⚠⚠ IT DELIBERATELY DOES NOT DISTINGUISH *"has no provider profile"* FROM *"has not
       ticked the box"*: both mean the same thing to the reader, and naming which would leak
       whether a member is a provider at all to anybody who can POST. */
    throw new ConnectionError("This member isn’t accepting mentees right now.", "NOT_OPEN");
  }

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
    /* ⚠ `from_user_id` — the invite's SENDER is who hears that it was accepted. */
    select: { id: true, from_user_id: true },
  });
  if (!row) throw new ConnectionError("That request is no longer open", "NOT_FOUND");
  const updated = await prisma.connection.update({
    where: { id: row.id },
    /* ⚠ `responded_at` IS NOT OPTIONAL HERE — the harness fails the build if an
       ACCEPTED colleague row lacks one. */
    data: { status: "ACCEPTED", responded_at: new Date() },
  });

  /* ⚠⚠ THE WAIT IS OVER, SO THE WORKLIST ITEM GOES (ruling 34e). */
  await clearInviteWorklist(row.id);

  /*
    ⚠⚠⚠ AND THE PERSON WHO ASKED IS TOLD — a notice, never a worklist item.
    ⚠ Nothing is owed by them; they asked and got an answer. ⚠⚠ The recipient is
    the INVITER (`from_user_id`), which is the opposite direction from the
    invite above — getting that backwards would tell the accepter that they
    accepted, which is the "nobody is notified about their own action" rule
    (WS-B item 3) failing in the most confusing way available.
  */
  const accepter = await prisma.person.findFirst({
    where: { user_id: me },
    select: { first_name: true, last_name: true },
  });
  const inviter = await prisma.person.findFirst({
    where: { user_id: row.from_user_id },
    select: { id: true },
  });
  if (inviter) {
    await notify({
      event: "colleague.invite_accepted",
      personId: inviter.id,
      entityType: "connection",
      entityId: row.id,
      dedupeKey: `colleague.accepted:${row.id}`,
      vars: {
        fromName:
          [accepter?.first_name, accepter?.last_name].filter(Boolean).join(" ") || "Someone",
      },
    });
  }
  return updated;
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
  const updated = await prisma.connection.update({
    where: { id: row.id },
    data: { status: "DECLINED", responded_at: new Date() },
  });

  /*
    ⚠⚠ DECLINING ALSO ENDS THE WAIT, SO THE ITEM GOES. ⚠⚠⚠ AND NOBODY IS TOLD:
    `DECLINED` is a first-class state here precisely so a declined request is
    not re-offered, and the standing rule on this surface is that a colleague
    decline is SILENT — telling the sender they were turned down is a judgement
    the product deliberately does not deliver. ⚠ That is the opposite of the
    GROUP decline (ruling 34e), and the difference is real: a group owner is
    administering a room, while a colleague request is personal.
  */
  await clearInviteWorklist(row.id);
  return updated;
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
  companyId: string | null;
};

const personSelect = {
  id: true,
  first_name: true,
  last_name: true,
  title: true,
  photo_url: true,
  company: { select: { id: true, name: true, show_on_profiles: true } },
  user: { select: { id: true } },
} as const;

type PersonRow = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  photo_url: string | null;
  company: { id: string; name: string; show_on_profiles: boolean } | null;
  user: { id: string } | null;
};

const toCard = (p: PersonRow): PersonCard => ({
  userId: p.user?.id ?? "",
  personId: p.id,
  name: `${p.first_name} ${p.last_name}`.trim(),
  title: p.title,
  photoUrl: p.photo_url,
  // The company's Visibility switch hides its name from members' cards.
  company: p.company?.show_on_profiles ? p.company.name : null,
  companyId: p.company?.show_on_profiles ? p.company.id : null,
});

/**
 * ⚠⚠ ONE RELATION CALCULATION, AND THIS IS IT (`P2-J3-E525`).
 *
 * Extracted from `searchMembers`, which is still its only other caller, so that
 * `memberByEmail` below cannot drift from it. ⚠ A SECOND COPY OF THIS IS THE
 * DEFECT — `E525` exists because `/invite-colleague` answered "is there a row"
 * with its own lookup instead of asking the question this file already answers.
 *
 * ⚠ `incomingConnectionId` IS THE HALF `relation` CANNOT CARRY. `relation` is
 * `"PENDING"` whether I sent it or they did, and `ConnectControls` renders
 * `Accept` rather than a disabled `Requested` only when it has the id. The
 * direction is read here, from `to_user_id`, not guessed by the caller.
 */
type ConnectionRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  kind: string;
  status: string;
};

function relationFor(me: string, userId: string, rows: ConnectionRow[]) {
  const rel = rows.find(
    (c) => (c.from_user_id === userId || c.to_user_id === userId) && c.kind === "COLLEAGUE"
  );
  const follows = rows.find(
    (c) => c.kind === "MENTOR" && c.from_user_id === me && c.to_user_id === userId
  );
  return {
    /* ⚠ THE ROW'S LABEL COMES FROM THE DATA, so it can read "Requested" rather
       than offering an add that would be a no-op. */
    relation: rel
      ? (rel.status as ConnectionStatusValue)
      : follows
        ? ("FOLLOWING" as const)
        : null,
    incomingConnectionId:
      rel && rel.status === "PENDING" && rel.to_user_id === me ? rel.id : null,
    isMentor: Boolean(follows),
  };
}

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
      /* `E821` — deactivated and test members are not listed. */
      user: { isNot: null, is: { id: { not: me }, is_active: true, is_test: false } },
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
    return { ...card, relation: relationFor(me, card.userId, mine).relation };
  });
}

/**
 * ⚠⚠ ONE MEMBER, RESOLVED BY EMAIL ADDRESS (`P2-J3-E525`).
 *
 * SCOTT, 2026-09-15: *"I put the email in and it exists...show the card for that
 * email and the CONNECT or MESSAGE buttons."*
 *
 * ⚠⚠ THIS IS `searchMembers`' ANSWER FOR ONE PERSON, NOT A SECOND CARD TYPE.
 * Same `personSelect`, same `toCard`, same `relationFor`. The only thing that
 * differs is the question — an exact address rather than a name fragment — which
 * is why it cannot simply call `searchMembers`: that one searches name, title and
 * company, and never email.
 *
 * ⚠⚠ IT DOES NOT EXCLUDE YOURSELF, AND THAT IS DELIBERATE. `searchMembers` drops
 * your own row because a search result you cannot act on is noise; here you typed
 * the address, so the honest answer is "that is you". ⚠ `isSelf` carries it and
 * `ConnectControls` renders nothing for it — the rule stays in the control.
 *
 * ⚠ RETURNS `null` FOR AN ADDRESS WITH NO `Person`. A `User` can exist without
 * one, and there is no card to draw for it — the caller keeps its old refusal for
 * that case rather than inventing a blank card.
 */
export type MemberWithRelation = PersonCard & {
  relation: ConnectionStatusValue | "FOLLOWING" | null;
  incomingConnectionId: string | null;
  isMentor: boolean;
  isSelf: boolean;
};

export async function memberByEmail(
  viewer: Viewer,
  email: string
): Promise<MemberWithRelation | null> {
  const me = await ownUserId(viewer);

  /* ⚠ THE ADDRESS IS MATCHED AS THE CALLER NORMALISED IT. `normalizeEmail` runs
     at every write and a `lower(email)` unique index backs it, so an exact match
     is the same lookup the old `findFirst({ where: { email } })` did. */
  const row = await prisma.person.findFirst({
    where: { user: { is: { email } } },
    select: personSelect,
  });
  if (!row?.user) return null;

  const card = toCard(row);
  const rows = await prisma.connection.findMany({
    where: {
      OR: [
        { from_user_id: me, to_user_id: card.userId },
        { to_user_id: me, from_user_id: card.userId },
      ],
    },
  });

  return { ...card, ...relationFor(me, card.userId, rows), isSelf: card.userId === me };
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
    /* `E821` — a connection to a deactivated member is KEPT but not listed. */
    where: { user: { is: { id: { in: otherIds }, is_active: true, is_test: false } } },
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

    /*
      ⚠⚠ HOW MANY MEMBERS CONNECTED TO **ME** AS A MENTOR (`P1-ALL-E374`).

      ⚠ THIS IS THE MECHANISM, NOT A VANITY COUNTER, AND IT IS THE REASON THIS
      READ EXISTS AT ALL. Everything else in this function answers "who did I
      reach out to". `following` is MENTOR rows where `from_user_id` is me —
      people I asked. This is the mirror: MENTOR rows where `to_user_id` is me.

      SCOTT, 2026-09-03: *"everyone CAN be. the determining factor is if anyone
      wants you to be...and therefore makes a request from you."*

      ⚠⚠ SO THIS NUMBER IS THE ONLY PLACE IN THE ENTIRE PRODUCT WHERE A MEMBER
      FINDS OUT THEY ARE A MENTOR. There is no opt-in, no MentorProfile, no
      application and no approval — being asked IS the qualification, so the
      count IS the status. Nothing else tells them.

      ⚠ THERE IS DELIBERATELY NOTHING TO ACT ON. No accept, no decline, no
      inbox. A MENTOR row is written ACCEPTED by `followMentor`, and
      `check:community` asserts a MENTOR row is never PENDING — so there is no
      pending state that could need a button. Adding one would invent an
      approval step Scott explicitly refused.

      ⚠ THE CALLER HIDES THE BLOCK AT ZERO. *"0 members connected to you as a
      mentor"* tells a new member they are unwanted, which is useless and untrue
      this early. The lib still returns the honest 0 — hiding is a rendering
      decision, and the number stays auditable either way.
    */
    mentorConnectionCount: rows.filter(
      (r) => r.kind === "MENTOR" && r.to_user_id === me
    ).length,
  };
}

/**
 * ── ⚠⚠ `You Both Know` — MUTUAL COLLEAGUES (`P2-J3-E588` WS-B) ─────────────
 *
 * ⚠ THE VISITOR'S SIDE OF THE LEFT RAIL. Where an owner sees `Viewing Me` —
 * which has no data and renders a dash — a visitor sees this, and this IS a
 * real query. The brief: *"`You Both Know` IS computable from `Connection` —
 * build that one, it is a real query."*
 *
 * ⚠⚠ ACCEPTED COLLEAGUE EDGES ONLY, ON BOTH SIDES. A pending request is not a
 * colleague, and counting one would tell a visitor they share a connection that
 * neither person has agreed to. ⚠ `DECLINED` is excluded for the same reason it
 * is never listed anywhere: it is the other person's business (`E372`).
 *
 * ⚠ A connection is UNDIRECTED for `COLLEAGUE` — the row exists once, with
 * whoever asked as `from`. So "who are X's colleagues" has to read both columns,
 * which is why this cannot be a single `where` on one field.
 *
 * ⚠⚠ MENTOR ROWS ARE EXCLUDED. A `MENTOR` row is created `ACCEPTED`
 * unilaterally — `followMentor` writes it without the other person agreeing —
 * so counting them would let anyone inflate a shared-connection number by
 * following people. That is the same reasoning that keeps messaging
 * colleague-only.
 */
export async function mutualColleagueCount(
  viewer: Viewer,
  otherUserId: string
): Promise<number> {
  const me = await ownUserId(viewer);
  if (me === otherUserId) return 0;

  const colleagueIdsOf = async (userId: string): Promise<Set<string>> => {
    const rows = await prisma.connection.findMany({
      where: {
        kind: "COLLEAGUE",
        status: "ACCEPTED",
        OR: [{ from_user_id: userId }, { to_user_id: userId }],
      },
      select: { from_user_id: true, to_user_id: true },
    });
    return new Set(
      rows.map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id))
    );
  };

  const [mine, theirs] = await Promise.all([
    colleagueIdsOf(me),
    colleagueIdsOf(otherUserId),
  ]);

  let shared = 0;
  for (const id of mine) {
    /* ⚠ THE TWO PEOPLE THEMSELVES ARE NOT "SHARED". If they are already
       colleagues with each other, each appears in the other's set, and counting
       that would report a mutual connection that is just the pair. */
    if (id !== otherUserId && id !== me && theirs.has(id)) shared += 1;
  }
  return shared;
}

export type OutgoingRequest = {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  sentAt: Date;
};

/** Pending colleague requests this member has SENT (R-E011). */
export async function outgoingRequests(viewer: Viewer): Promise<OutgoingRequest[]> {
  const rows = await prisma.connection.findMany({
    where: { from_user_id: viewer.userId, kind: "COLLEAGUE", status: "PENDING" },
    orderBy: { created_at: "desc" },
    select: { id: true, to_user_id: true, created_at: true },
  });
  if (rows.length === 0) return [];
  const people = await prisma.person.findMany({
    where: { user_id: { in: rows.map((r) => r.to_user_id) }, ...memberVisibleWhere() },
    select: { user_id: true, first_name: true, last_name: true, title: true, photo_url: true },
  });
  const byUser = new Map(people.map((p) => [p.user_id, p]));
  return rows.flatMap((r) => {
    const p = byUser.get(r.to_user_id);
    if (!p) return [];
    return [{
      id: r.id,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A member",
      title: p.title,
      photoUrl: p.photo_url,
      sentAt: r.created_at,
    }];
  });
}

/** Take back a request the member sent. The row is kept: deleting a connection
 *  loses the history, and WITHDRAWN is not DECLINED. */
export async function withdrawRequest(viewer: Viewer, connectionId: string): Promise<boolean> {
  const res = await prisma.connection.updateMany({
    where: { id: connectionId, from_user_id: viewer.userId, kind: "COLLEAGUE", status: "PENDING" },
    data: { status: "WITHDRAWN" },
  });
  return res.count === 1;
}
