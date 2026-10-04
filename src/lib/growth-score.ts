import { prisma } from "@/lib/prisma";

export const GROWTH_WEIGHTS = {
  INVITED: 10,
  /** Per invited person who actually signed up. */
  JOINED: 50,
  ACTIVE_BONUS: 40,
} as const;

export type GrowthWindow = "month" | "last-month" | "all";

export type GrowthScore = {
  personId: string;
  invited: number;
  joined: number;
  active: number | null;
  points: number;
};

export function windowRange(
  window: GrowthWindow,
  now = new Date()
): { from: Date | null; to: Date | null } {
  if (window === "all") return { from: null, to: null };
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (window === "last-month") {
    return {
      from: new Date(Date.UTC(y, m - 1, 1)),
      to: new Date(Date.UTC(y, m, 1)),
    };
  }
  return { from: new Date(Date.UTC(y, m, 1)), to: null };
}

function dateFilter(from: Date | null, to: Date | null) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

/** Days remaining in the current UTC month, for the board's reset line. */
export function daysLeftInMonth(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.ceil((next - now.getTime()) / 86_400_000);
}

export async function growthScore(
  personId: string,
  window: GrowthWindow = "month",
  now = new Date()
): Promise<GrowthScore> {
  const { from, to } = windowRange(window, now);
  const range = dateFilter(from, to);

  const invited = await prisma.colleagueInvite.count({
    where: { inviter_person_id: personId, ...(range ? { created_at: range } : {}) },
  });

  const joined = await prisma.colleagueInvite.count({
    where: {
      inviter_person_id: personId,
      accepted_at: { not: null, ...(range ?? {}) },
    },
  });

  const active: number | null = null;

  return {
    personId,
    invited,
    joined,
    active,
    points:
      invited * GROWTH_WEIGHTS.INVITED +
      joined * GROWTH_WEIGHTS.JOINED +
      (active ?? 0) * GROWTH_WEIGHTS.ACTIVE_BONUS,
  };
}

export type GrowthRow = GrowthScore & { rank: number; name: string; photoUrl: string | null };

export const BOARD_MIN_SCORERS = 3;

export function boardIsShown(board: GrowthRow[]): boolean {
  return board.length >= BOARD_MIN_SCORERS;
}

export function rankFor(board: GrowthRow[], personId: string): number | null {
  if (!boardIsShown(board)) return null;
  return board.find((r) => r.personId === personId)?.rank ?? null;
}

export async function growthBoard(
  window: GrowthWindow = "month",
  now = new Date()
): Promise<GrowthRow[]> {
  const { from, to } = windowRange(window, now);
  const range = dateFilter(from, to);

  const senders = await prisma.colleagueInvite.groupBy({
    by: ["inviter_person_id"],
    where: {
      inviter_person_id: { not: null },
      ...(range ? { created_at: range } : {}),
    },
  });
  const ids = senders.map((s) => s.inviter_person_id).filter((x): x is string => !!x);
  if (ids.length === 0) return [];

  const people = await prisma.person.findMany({
    where: { id: { in: ids }, is_support: false },
    select: { id: true, first_name: true, last_name: true, photo_url: true },
  });

  const scored = await Promise.all(
    people.map(async (p) => ({
      ...(await growthScore(p.id, window, now)),
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A member",
      photoUrl: p.photo_url,
    }))
  );

  return scored
    .filter((s) => s.points > 0)
    /* ⚠ Ties break on `joined` then on the id, so the order is STABLE between
       renders — a board that reshuffles on refresh reads as broken. */
    .sort((a, b) => b.points - a.points || b.joined - a.joined || a.personId.localeCompare(b.personId))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/**
 * ⚠⚠⚠ THE ONE MOVE THAT CHANGES YOUR RANK — COMPUTED, NEVER CANNED (WS-A 1).
 *
 * ⚠ The brief: *"e.g. 'One more colleague who joins puts you at #2'. Computed
 * from the board, never canned. If no single move changes your rank, say how
 * many points to the next spot."*
 * ⚠⚠ SO IT ASKS THE BOARD, not a template: it takes the gap to the person
 * directly above and reports whether ONE join closes it.
 */
export function nextMove(
  board: GrowthRow[],
  me: GrowthScore
): { text: string; reachable: boolean } | null {
  const above = [...board].reverse().find((r) => r.points > me.points);
  /* ⚠ Nobody above: either you lead, or the board is empty. Both are honest
     answers and neither is a "move". */
  if (!above) return null;
  const gap = above.points - me.points;
  if (gap <= GROWTH_WEIGHTS.JOINED) {
    return {
      text: `One more colleague who joins puts you at #${above.rank}.`,
      reachable: true,
    };
  }
  return {
    text: `${gap} points to #${above.rank}.`,
    reachable: false,
  };
}

/**
 * ── ⚠⚠⚠ MOVEMENT SINCE LAST MONTH (WS-B 2) ───────────────────────────────
 *
 * ⚠ SCOTT, 2026-09-22: *"the score comes from dated invite and join rows, so
 * last month's rank can be computed from the same data. Build it."*
 * ⚠⚠ THE BRIEF ALLOWED THE COLUMN TO BE DROPPED — *"Movement only if last month
 * can be computed; otherwise leave the column out"* — AND IT CAN BE, so it is
 * built. Both ends of every term are dated: `created_at` for an invite and
 * `accepted_at` for a join.
 *
 * ⚠⚠⚠ `null` MEANS "NO PREVIOUS RANK", WHICH IS NOT THE SAME AS "DID NOT MOVE".
 * Somebody who was not on last month's board has not held station — they are
 * new, and the page says `NEW` rather than a dash. ⚠ This is the same rule the
 * `Active` row follows: a missing measurement never renders as a neutral value.
 */
export type Movement = { delta: number | null };

export async function movementFor(
  board: GrowthRow[],
  now = new Date()
): Promise<Map<string, Movement>> {
  const previous = await growthBoard("last-month", now);
  /* ⚠ RANK, NOT POINTS. A member can earn more than last month and still fall,
     and the column is about position — the arrow has to agree with the number
     beside it. */
  const was = new Map(previous.map((r) => [r.personId, r.rank]));
  const out = new Map<string, Movement>();
  for (const row of board) {
    const before = was.get(row.personId);
    /* ⚠⚠ POSITIVE IS UP: rank 5 → rank 2 is +3. Subtracting the other way round
       would draw ▲ for a fall, which is the kind of sign error nobody notices
       until a member complains. */
    out.set(row.personId, { delta: before == null ? null : before - row.rank });
  }
  return out;
}

/**
 * ── ⚠⚠ MY NETWORK — THE PEOPLE YOU BROUGHT IN (WS-B 1) ───────────────────
 *
 * ⚠ SCOTT: *"list the people you brought in, with whether each has joined. Real
 * data today is likely just the one attributed invite. Show what exists."*
 *
 * ⚠⚠⚠ IT IS NOT A BOARD AND IT IS NOT SCORED. It lists `colleague_invites`
 * rows, which carry an EMAIL and an optional name — **not a person**. ⚠ Nothing
 * links an accepted invite to the account it created, so this cannot name who
 * joined or link to their profile. **That is `WS-C` item 6**, recorded in the
 * brief at this gate; until it lands, `joined` here means *"this invitation was
 * accepted"*, which is the honest claim the data supports.
 */
export type NetworkRow = {
  id: string;
  email: string;
  name: string | null;
  invitedAt: Date;
  joinedAt: Date | null;
};

export async function myNetwork(personId: string): Promise<NetworkRow[]> {
  const rows = await prisma.colleagueInvite.findMany({
    where: { inviter_person_id: personId },
    select: {
      id: true,
      invitee_email: true,
      invitee_first_name: true,
      invitee_last_name: true,
      created_at: true,
      accepted_at: true,
    },
    /* ⚠ Joined first, then most recently invited — the useful order is "what
       came of this", not "what I did most recently". */
    orderBy: [{ accepted_at: { sort: "desc", nulls: "last" } }, { created_at: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    email: r.invitee_email,
    name:
      `${r.invitee_first_name ?? ""} ${r.invitee_last_name ?? ""}`.trim() || null,
    invitedAt: r.created_at,
    joinedAt: r.accepted_at,
  }));
}

/**
 * ⚠⚠ THE PROVIDER PAGE FOR EACH RANKED PERSON, WHERE ONE EXISTS.
 *
 * ⚠ The brief asks rows to link *"via `/people/[personId]` if that brief has
 * landed, else the provider page"*. ⚠⚠ MEASURED 2026-09-22: **there is no
 * `/people` route on disk**, so it is the provider page.
 * ⚠⚠⚠ AND NOT EVERY RANKED MEMBER HAS ONE — a buyer or a requester can invite
 * colleagues and rank, with no `ProviderProfile` at all. Their name renders as
 * PLAIN TEXT rather than a link to nowhere, which is `E579`'s rule: an entry
 * that looks like a door and is not.
 */
export async function providerHrefs(personIds: string[]): Promise<Map<string, string>> {
  if (personIds.length === 0) return new Map();
  const profiles = await prisma.providerProfile.findMany({
    where: { person_id: { in: personIds } },
    select: { id: true, person_id: true },
  });
  return new Map(profiles.map((p) => [p.person_id, `/providers/${p.id}`]));
}
