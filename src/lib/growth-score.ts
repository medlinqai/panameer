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

  // Two grouped counts for the whole board instead of two queries per person (Connect was slow to open).
  const [senders, joins] = await Promise.all([
    prisma.colleagueInvite.groupBy({
      by: ["inviter_person_id"],
      where: { inviter_person_id: { not: null }, ...(range ? { created_at: range } : {}) },
      _count: { _all: true },
    }),
    prisma.colleagueInvite.groupBy({
      by: ["inviter_person_id"],
      where: { inviter_person_id: { not: null }, accepted_at: { not: null, ...(range ?? {}) } },
      _count: { _all: true },
    }),
  ]);
  const invitedBy = new Map(senders.map((s) => [s.inviter_person_id as string, s._count._all]));
  const joinedBy = new Map(joins.map((s) => [s.inviter_person_id as string, s._count._all]));
  const ids = [...invitedBy.keys()];
  if (ids.length === 0) return [];

  const people = await prisma.person.findMany({
    where: { id: { in: ids }, is_support: false },
    select: { id: true, first_name: true, last_name: true, photo_url: true },
  });

  const scored = people.map((p) => {
    const invited = invitedBy.get(p.id) ?? 0;
    const joined = joinedBy.get(p.id) ?? 0;
    return {
      personId: p.id,
      invited,
      joined,
      active: null,
      points: invited * GROWTH_WEIGHTS.INVITED + joined * GROWTH_WEIGHTS.JOINED,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "A member",
      photoUrl: p.photo_url,
    };
  });

  return scored
    .filter((s) => s.points > 0)
    // Ties break on `joined` then on the id, so the order is STABLE between
    .sort((a, b) => b.points - a.points || b.joined - a.joined || a.personId.localeCompare(b.personId))
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

/** THE ONE MOVE THAT CHANGES YOUR RANK — COMPUTED, NEVER CANNED (WS-A 1). */
export function nextMove(
  board: GrowthRow[],
  me: GrowthScore
): { text: string; reachable: boolean } | null {
  const above = [...board].reverse().find((r) => r.points > me.points);
  // Nobody above: either you lead, or the board is empty. Both are honest
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

/** MOVEMENT SINCE LAST MONTH (WS-B 2) */
export type Movement = { delta: number | null };

export async function movementFor(
  board: GrowthRow[],
  now = new Date()
): Promise<Map<string, Movement>> {
  const previous = await growthBoard("last-month", now);
  // RANK, NOT POINTS. A member can earn more than last month and still fall
  const was = new Map(previous.map((r) => [r.personId, r.rank]));
  const out = new Map<string, Movement>();
  for (const row of board) {
    const before = was.get(row.personId);
    // POSITIVE IS UP: rank 5 → rank 2 is +3. Subtracting the other way round
    out.set(row.personId, { delta: before == null ? null : before - row.rank });
  }
  return out;
}

/** MY NETWORK — THE PEOPLE YOU BROUGHT IN (WS-B 1) */
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
    // Joined first, then most recently invited — the useful order is "what
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

/** THE PROVIDER PAGE FOR EACH RANKED PERSON, WHERE ONE EXISTS. */
export async function providerHrefs(personIds: string[]): Promise<Map<string, string>> {
  if (personIds.length === 0) return new Map();
  const profiles = await prisma.providerProfile.findMany({
    where: { person_id: { in: personIds } },
    select: { id: true, person_id: true },
  });
  return new Map(profiles.map((p) => [p.person_id, `/providers/${p.id}`]));
}
