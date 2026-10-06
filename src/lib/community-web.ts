import { memberVisibleWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

export type WebPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type CommunityWeb = {
  me: WebPerson | null;
  joined: WebPerson[];
  invited: { id: string; name: string | null; email: string }[];
  reachable: { id: string; name: string; photoUrl: string | null; viaId: string }[];
  overflow: { joined: number; invited: number; reachable: number };
};

export type WebFigures = { joined: number; invited: number; reachable: number };

export function webFigures(web: {
  joined: unknown[];
  invited: unknown[];
  reachable: unknown[];
  overflow: { joined: number; invited: number; reachable: number };
}): WebFigures {
  return {
    joined: web.joined.length + web.overflow.joined,
    invited: web.invited.length + web.overflow.invited,
    reachable: web.reachable.length + web.overflow.reachable,
  };
}

export const WEB_CAPS = { inner: 16, outer: 20 } as const;

async function colleagueUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: userId }, { to_user_id: userId }],
    },
    select: { from_user_id: true, to_user_id: true },
    orderBy: { created_at: "desc" },
  });
  return rows.map((r) => (r.from_user_id === userId ? r.to_user_id : r.from_user_id));
}

export async function getCommunityWeb(viewer: Viewer): Promise<CommunityWeb> {
  const meUserId = viewer.userId;

  const mePerson = await prisma.person.findFirst({
    where: { user_id: meUserId },
    select: { id: true, first_name: true, last_name: true, photo_url: true },
  });

  const empty: CommunityWeb = {
    me: mePerson
      ? {
          id: mePerson.id,
          name: `${mePerson.first_name} ${mePerson.last_name}`.trim(),
          photoUrl: mePerson.photo_url,
        }
      : null,
    joined: [],
    invited: [],
    reachable: [],
    overflow: { joined: 0, invited: 0, reachable: 0 },
  };

  /* ── 1 · joined ──────────────────────────────────────────────────────── */
  const firstDegree = await colleagueUserIds(meUserId);
  const firstSet = new Set(firstDegree);

  const joinedPeople = firstDegree.length
    ? await prisma.person.findMany({
        /* `E821` */
        where: { user_id: { in: firstDegree }, ...memberVisibleWhere() },
        select: { id: true, user_id: true, first_name: true, last_name: true, photo_url: true },
      })
    : [];

  /* user id -> person id, needed to resolve a second-degree node's `via`. */
  const personIdByUser = new Map(joinedPeople.map((p) => [p.user_id ?? "", p.id]));

  // guarantee — so the newest-first order established by `colleagueUserIds` is
  const rankByUser = new Map(firstDegree.map((u, i) => [u, i]));
  const joinedAll: WebPerson[] = joinedPeople
    .slice()
    .sort(
      (a, b) =>
        (rankByUser.get(a.user_id ?? "") ?? Number.MAX_SAFE_INTEGER) -
        (rankByUser.get(b.user_id ?? "") ?? Number.MAX_SAFE_INTEGER)
    )
    .map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      photoUrl: p.photo_url,
    }));

  /* ── 2 · invited ─────────────────────────────────────────────────────── */
  // EXPIRY IS COMPUTED FROM `expires_at`, NOT READ FROM `status`. The
  const invitedAll = mePerson
    ? await prisma.colleagueInvite.findMany({
        where: {
          inviter_person_id: mePerson.id,
          status: "PENDING",
          expires_at: { gt: new Date() },
        },
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          invitee_email: true,
          invitee_first_name: true,
          invitee_last_name: true,
        },
      })
    : [];

  /* ── 3 · reachable — the second degree ───────────────────────────────── */
  // THIS DID NOT EXIST BEFORE WS-B, and `getColleagueSuggestions` is
  const secondRows = firstDegree.length
    ? await prisma.connection.findMany({
        where: {
          kind: "COLLEAGUE",
          status: "ACCEPTED",
          OR: [{ from_user_id: { in: firstDegree } }, { to_user_id: { in: firstDegree } }],
        },
        select: { from_user_id: true, to_user_id: true },
      })
    : [];

  // FIRST `via` WINS, DELIBERATELY. Somebody reachable through three
  const viaByCandidate = new Map<string, string>();
  for (const r of secondRows) {
    const [a, b] = [r.from_user_id, r.to_user_id];
    for (const [via, cand] of [
      [a, b],
      [b, a],
    ] as const) {
      if (!firstSet.has(via)) continue;
      /* Not me, not already a colleague, not already claimed. */
      if (cand === meUserId || firstSet.has(cand) || viaByCandidate.has(cand)) continue;
      viaByCandidate.set(cand, via);
    }
  }

  const candidateIds = [...viaByCandidate.keys()];
  const reachablePeople = candidateIds.length
    ? await prisma.person.findMany({
        /* `E821` */
        where: { user_id: { in: candidateIds }, ...memberVisibleWhere() },
        select: { id: true, user_id: true, first_name: true, last_name: true, photo_url: true },
      })
    : [];

  const reachableAll = reachablePeople
    .map((p) => {
      const viaUser = viaByCandidate.get(p.user_id ?? "") ?? "";
      return {
        id: p.id,
        name: `${p.first_name} ${p.last_name}`.trim(),
        photoUrl: p.photo_url,
        viaId: personIdByUser.get(viaUser) ?? "",
      };
    })
    // A node with no resolvable `via` has nothing to hang off and is dropped
    .filter((r) => r.viaId !== "");

  /* ── caps ────────────────────────────────────────────────────────────── */
  // THE INNER RING HOLDS `joined` AND `invited` TOGETHER, so they share one
  const joined = joinedAll.slice(0, WEB_CAPS.inner);
  const invitedRoom = Math.max(0, WEB_CAPS.inner - joined.length);
  const invited = invitedAll.slice(0, invitedRoom).map((i) => ({
    id: i.id,
    name: `${i.invitee_first_name ?? ""} ${i.invitee_last_name ?? ""}`.trim() || null,
    email: i.invitee_email,
  }));

  // A reachable node whose `via` was capped off the inner ring has nothing to
  const keptJoined = new Set(joined.map((j) => j.id));
  const reachable = reachableAll
    .filter((r) => keptJoined.has(r.viaId))
    .slice(0, WEB_CAPS.outer);

  return {
    ...empty,
    joined,
    invited,
    reachable,
    overflow: {
      joined: joinedAll.length - joined.length,
      invited: invitedAll.length - invited.length,
      reachable: reachableAll.length - reachable.length,
    },
  };
}
