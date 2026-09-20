import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ THE COMMUNITY WEB'S DATA (`P2-J3-E591` WS-B) ───────────────────────
 *
 * ⚠ Three node kinds, and they are DATA, NOT DECORATION — each one is a
 * different fact about a different row:
 *
 *   `joined`    an ACCEPTED COLLEAGUE connection. They have a Person, so they
 *               have a name and may have a photo.
 *   `invited`   a PENDING `ColleagueInvite` the viewer sent. ⚠⚠ AN INVITE HOLDS
 *               NAME AND EMAIL ONLY — there is no Person, no title, no photo,
 *               and the shape below CANNOT carry one.
 *   `reachable` a colleague OF a colleague, not yet asked. ⚠ It names the
 *               colleague it is reached THROUGH, because the drawing hangs it
 *               off that node rather than off the centre.
 *
 * ── ⚠⚠⚠ NO RATE. NOT ONE FIELD, NOT ANYWHERE ──────────────────────────────
 *
 * ⚠ Scott, 2026-09-20: *"I do nto think providers should see other provider's
 * rates."* ⚠⚠ THIS PAYLOAD CROSSES TO THE BROWSER, so omitting a rate from the
 * render would not be enough — a rate in the JSON is disclosed whether or not
 * anything draws it. ⚠ It is omitted from the QUERY, which is the only version
 * of this rule that holds.
 *
 * ⚠⚠ RECORDED, NOT FIXED HERE — `ConnectHome.tsx` CALLS `ratesByPersonId`
 * THREE TIMES ON THIS PAGE (its lines 68-70) and uses only `.profileId` off the
 * result. No rate string reaches the DOM today, but the rate columns ARE read
 * on `/community`. ⚠ That is `WS-C` item 7's job, and it is a one-line swap to
 * a `providerProfile.findMany` selecting `{ id, person_id }`. **Not done here**
 * — WS-B is the web, and a change to what Connect Home queries belongs with the
 * page rewrite that owns those rows.
 */

/** ⚠ A face the drawing can paint. `invited` can never have one. */
export type WebPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
};

export type CommunityWeb = {
  /** ⚠ The viewer, drawn at the centre. `null` when they have no Person row. */
  me: WebPerson | null;
  joined: WebPerson[];
  /**
   * ⚠⚠ NAME IS WHAT THE INVITE HOLDS, AND IT MAY BE JUST AN EMAIL. `null` name
   * is a real state — `invitee_first_name` is optional on the model — and the
   * drawing must not invent one.
   */
  invited: { id: string; name: string | null; email: string }[];
  /** ⚠ `viaId` is a `joined` id. The drawing links the two. */
  reachable: { id: string; name: string; photoUrl: string | null; viaId: string }[];
  /** ⚠ How many were dropped by the caps below, so the page can say so. */
  overflow: { joined: number; invited: number; reachable: number };
};

/**
 * ⚠⚠ CAPS EXIST BECAUSE A RING HAS A CIRCUMFERENCE. Beyond these the nodes
 * touch, and two nodes on top of each other is the exact defect Scott named in
 * the mockup. ⚠ The layout asserts its own spacing (`community-web-layout.ts`);
 * these numbers are what that assertion is satisfied at.
 * ⚠ A capped web says *"+N more"* — it never silently shows a smaller network.
 */
export const WEB_CAPS = { inner: 16, outer: 20 } as const;

/** ⚠ Both halves of an undirected COLLEAGUE edge, as user ids. */
async function colleagueUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.connection.findMany({
    where: {
      kind: "COLLEAGUE",
      status: "ACCEPTED",
      OR: [{ from_user_id: userId }, { to_user_id: userId }],
    },
    select: { from_user_id: true, to_user_id: true },
  });
  /* ⚠⚠ A COLLEAGUE EDGE IS UNDIRECTED AND IS STORED ONCE, with whoever asked as
     `from`. Reading one column would return half the graph — and would return a
     DIFFERENT half depending on who did the asking. */
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
        where: { user_id: { in: firstDegree } },
        select: { id: true, user_id: true, first_name: true, last_name: true, photo_url: true },
      })
    : [];

  /* ⚠ user id -> person id, needed to resolve a second-degree node's `via`. */
  const personIdByUser = new Map(joinedPeople.map((p) => [p.user_id ?? "", p.id]));

  const joinedAll: WebPerson[] = joinedPeople.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    photoUrl: p.photo_url,
  }));

  /* ── 2 · invited ─────────────────────────────────────────────────────── */
  /*
    ⚠⚠ EXPIRY IS COMPUTED FROM `expires_at`, NOT READ FROM `status`. The
    `ColleagueInviteStatus` enum has an `EXPIRED` value and NOTHING EVER WRITES
    IT — measured 2026-09-20. ⚠ Filtering on `status: "PENDING"` alone would
    draw invitations that lapsed weeks ago as if they were still in flight.
    ⚠ `inviteColleague` already treats "live" as exactly this pair of
    conditions; this agrees with it rather than inventing a second rule.
  */
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
  /*
    ⚠⚠ THIS DID NOT EXIST BEFORE `E591` WS-B, and `getColleagueSuggestions` is
    NOT it: that is a FACT match (same employer, same client, same
    specialization + state) and reads no edges at all. ⚠ The web's third ring is
    a GRAPH claim — *"a colleague's colleague"* — so it has to walk the graph.

    ⚠ ONE QUERY FOR THE WHOLE SECOND DEGREE, not one per colleague. The
    alternative is `mutualColleagueCount`'s shape, which costs two queries per
    person and would be N+1 across a roster.
  */
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

  /*
    ⚠⚠ FIRST `via` WINS, DELIBERATELY. Somebody reachable through three
    colleagues is still ONE person and must be ONE node — drawing them once per
    path would overstate the network, which is the `E537` sum-versus-union
    mistake in a picture.
  */
  const viaByCandidate = new Map<string, string>();
  for (const r of secondRows) {
    const [a, b] = [r.from_user_id, r.to_user_id];
    for (const [via, cand] of [
      [a, b],
      [b, a],
    ] as const) {
      if (!firstSet.has(via)) continue;
      /* ⚠ Not me, not already a colleague, not already claimed. */
      if (cand === meUserId || firstSet.has(cand) || viaByCandidate.has(cand)) continue;
      viaByCandidate.set(cand, via);
    }
  }

  const candidateIds = [...viaByCandidate.keys()];
  const reachablePeople = candidateIds.length
    ? await prisma.person.findMany({
        where: { user_id: { in: candidateIds } },
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
    /* ⚠ A node with no resolvable `via` has nothing to hang off and is dropped
       rather than drawn floating at the centre. */
    .filter((r) => r.viaId !== "");

  /* ── caps ────────────────────────────────────────────────────────────── */
  /*
    ⚠⚠ THE INNER RING HOLDS `joined` AND `invited` TOGETHER, so they share one
    cap — they are drawn on the same circle and it is the circle that runs out
    of room. ⚠ Joined are kept first: a real colleague outranks an unanswered
    invitation for the last seat.
  */
  const joined = joinedAll.slice(0, WEB_CAPS.inner);
  const invitedRoom = Math.max(0, WEB_CAPS.inner - joined.length);
  const invited = invitedAll.slice(0, invitedRoom).map((i) => ({
    id: i.id,
    name: `${i.invitee_first_name ?? ""} ${i.invitee_last_name ?? ""}`.trim() || null,
    email: i.invitee_email,
  }));

  /* ⚠ A reachable node whose `via` was capped off the inner ring has nothing to
     link to, so it goes too. Consistency beats node count. */
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
