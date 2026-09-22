import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠⚠ GROWING THE NETWORK, SCORED (`P2-A3-E599` WS-A) ───────────────────
 *
 * ⚠ ONE FUNCTION AND ONE CONSTANT. The brief: *"The score is one function
 * (`growthScore(personId, window)`), used by the card, the board and any future
 * badge. ⚠ One function, one constant for the weights."*
 * ⚠⚠ THAT IS `E585`'s RULE APPLIED BEFORE THE SECOND READER EXISTS — a card and
 * a board quoting different totals is the defect, and the only reliable way to
 * prevent it is to have one computation from the start.
 *
 * ── ⚠⚠ SCORE THE JOIN, NOT THE SEND (ruling 1) ───────────────────────────
 *
 * ⚠ Scott: *"Invites sent are worth a little; a colleague who joins is worth
 * real points; one who becomes active is worth the most. Points on sends get
 * farmed with throwaway addresses."*
 * ⚠⚠⚠ SO `INVITED` IS DELIBERATELY THE SMALLEST WEIGHT and must stay that way.
 * A tuning pass that lifts it above `JOINED` re-opens the farming hole.
 */

/**
 * ⚠⚠ THE WEIGHTS, IN ONE PLACE, SO TUNING IS A ONE-LINE CHANGE (ruling 4).
 * ⚠ 🔶 SCOTT TO TUNE — these are the brief's starting numbers, not a decision.
 */
export const GROWTH_WEIGHTS = {
  /** ⚠ Per invitation SENT. The smallest weight, on purpose (ruling 1). */
  INVITED: 10,
  /** Per invited person who actually signed up. */
  JOINED: 50,
  /**
   * ⚠⚠⚠ DEFINED, WEIGHTED, AND NOT WIRED — AND THAT IS A RULING, NOT AN
   * OVERSIGHT. Scott, 2026-09-22: *"Ship Invited + Joined only, report Active as
   * unbuildable."*
   *
   * ⚠ MEASURED AT THE PREMISE CHECK, ALL THREE OF THE BRIEF'S PROPOSED SIGNALS
   * FAIL TODAY:
   *   · *"finished their profile"* — **57 of 61 profiles already meet the
   *     required set**, so the bonus would fire for nearly everyone at once; and
   *     `completeness.ts:49` forbids gating on the percentage in terms
   *     (*"DO NOT REINTRODUCE `completeness >= VISIBILITY_THRESHOLD`"*).
   *   · *"completed a course"* — **`LearnEnrollment` carries no completion
   *     field at all** (`id, user_id, learning_path_id, created_at`).
   *     `LessonProgress` has `completed_at` but is PER LESSON and holds
   *     **0 rows**; a COURSE completion is not modelled.
   *   · *"earned on a settled work order"* — **`WorkOrder` 0 rows, `Payment`
   *     0 rows**, and no payout model exists.
   *
   * ⚠⚠ THE WEIGHT SHIPS ANYWAY so that turning it on later is ONE FUNCTION and
   * not a re-litigation of the number. ⚠ `activeCount` is always `null` —
   * **`null` MEANS "NOT MEASURABLE", NEVER `0`**, and the page says so rather
   * than printing a zero that reads as "you have none".
   */
  ACTIVE_BONUS: 40,
  /*
    ── ⚠⚠⚠ `RECOMMENDATION_GIVEN` IS NOT HERE, AND IT IS NOT AN OMISSION ─────

    ⚠ The brief's ruling 4 lists *"Recommendation given | 15 each"*. ⚠⚠ MEASURED:
    **it cannot be counted, and not merely because the table is empty.**
    `RecommendationRequest` is keyed to `provider_profile_id` — the person
    RECEIVING the recommendation — and the giver is a CONTACT
    (`contact_name`, `contact_email`, `contact_off_platform`). ⚠⚠⚠ THERE IS NO
    "GIVEN BY MEMBER X" RELATION AT ALL, so there is nothing to attribute a
    point to. The table also holds 0 rows.
    ⚠ Scott, 2026-09-22, ruling on it: *"Drop it from the weights for now."*
    ⚠ SUPERSEDED, quoted not deleted (`E164`) — the brief's line:
    //   | Recommendation given | 15 each |
    ⚠⚠ ADDING IT BACK NEEDS A `recommender_person_id` ON
    `RecommendationRequest`, set when the contact matches a member. That is its
    own brief, and counting RECEIVED recommendations instead was considered and
    rejected: it scores being praised, not growing the network.
  */
} as const;

/**
 * The scoring window. `month` resets on the 1st (ruling 2).
 *
 * ⚠⚠ `last-month` EXISTS SO MOVEMENT CAN BE COMPUTED (WS-B 2). Scott,
 * 2026-09-22: *"the score comes from dated invite and join rows, so last
 * month's rank can be computed from the same data."* ⚠ It is the SAME function
 * over a different range — not a second scorer, and not a stored snapshot.
 * ⚠⚠⚠ A STORED RANK WOULD HAVE BEEN THE WRONG ANSWER: nothing writes one today,
 * so it could only start from now, and every member's first month would show no
 * movement for a reason that is about our bookkeeping rather than about them.
 */
export type GrowthWindow = "month" | "last-month" | "all";

export type GrowthScore = {
  personId: string;
  invited: number;
  joined: number;
  /** ⚠⚠ `null` MEANS NOT MEASURABLE, NEVER ZERO. See `ACTIVE_BONUS`. */
  active: number | null;
  points: number;
};

/**
 * ⚠⚠ THE WINDOW'S RANGE, IN UTC. The month resets on the 1st; `all` is
 * unbounded. ⚠ UTC so the reset does not depend on who is asking or where the
 * server is — the same discipline `profile-views.ts` uses for its day key.
 *
 * ⚠⚠⚠ `last-month` NEEDS A CEILING AS WELL AS A FLOOR, which is why this
 * returns a RANGE. ⚠ SUPERSEDED, quoted not deleted (`E164`) — it returned only
 * a floor, which is all `month` and `all` ever needed:
 * //   export function windowStart(window: GrowthWindow, now = new Date()): Date | null {
 * //     if (window === "all") return null;
 * //     return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
 * //   }
 */
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
      /* ⚠ EXCLUSIVE — the 1st of this month, used as `lt`. An inclusive end of
         "the 31st" is wrong in every month that is not 31 days. */
      to: new Date(Date.UTC(y, m, 1)),
    };
  }
  return { from: new Date(Date.UTC(y, m, 1)), to: null };
}

/** ⚠ Prisma's date filter for a window, or `{}` for unbounded. */
function dateFilter(from: Date | null, to: Date | null) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

/** Days remaining in the current UTC month, for the board's reset line. */
export function daysLeftInMonth(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return Math.ceil((next - now.getTime()) / 86_400_000);
}

/**
 * One person's growth score.
 *
 * ── ⚠⚠⚠ COUNT IT AND PRINT IT (ruling 6, and the LOCKED Counters decision) ──
 *
 * ⚠ Every number here is a real count against `colleague_invites`. Nothing is
 * estimated, and nothing is seeded into the figure.
 * ⚠⚠ THE WINDOW APPLIES TO **WHEN THE THING HAPPENED**, not to when the invite
 * was created: an invite sent in August that is ACCEPTED in September is a
 * September JOIN. Counting the join by `created_at` would credit the wrong
 * month and make "this month" unreconcilable with what the person did.
 */
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

  /*
    ⚠⚠ A JOIN IS `accepted_at`, WHICH THE SIGNUP PATH ALREADY SETS. ⚠⚠⚠ AND THE
    ATTRIBUTION IT DEPENDS ON HAS NEVER FIRED: measured at the premise check,
    `ColleagueInvite` holds 7 rows, **0 accepted**, and only **1** carries an
    `inviter_person_id`. `E493` stored the column and left it inert —
    *"Nothing reads this field today."* ⚠ THIS IS ITS FIRST READER.
    ⚠ So `joined` is honestly 0 for everyone today, and that is the data, not a
    stub.
  */
  const joined = await prisma.colleagueInvite.count({
    where: {
      inviter_person_id: personId,
      accepted_at: { not: null, ...(range ?? {}) },
    },
  });

  /* ⚠ `null`, not 0 — see `ACTIVE_BONUS`. No signal is countable today. */
  const active: number | null = null;

  return {
    personId,
    invited,
    joined,
    active,
    /* ⚠ `active` contributes nothing while it is null. When a signal lands, the
       term is `(active ?? 0) * GROWTH_WEIGHTS.ACTIVE_BONUS` and nothing else
       changes. */
    points:
      invited * GROWTH_WEIGHTS.INVITED +
      joined * GROWTH_WEIGHTS.JOINED +
      (active ?? 0) * GROWTH_WEIGHTS.ACTIVE_BONUS,
  };
}

export type GrowthRow = GrowthScore & { rank: number; name: string; photoUrl: string | null };

/**
 * ── ⚠⚠⚠ RULING 6 — FEWER THAN THREE SCORERS MEANS NO BOARD ───────────────
 *
 * ⚠ Scott: *"If the board has fewer than three people with a score, don't show
 * a board; show your own score and the invite panel."*
 */
export const BOARD_MIN_SCORERS = 3;

/**
 * ⚠⚠ ONE RULE, EVERY SURFACE. The board, the rank line and the profile's `Grow`
 * one-liner all ask THIS, so they cannot disagree about whether a rank exists.
 */
export function boardIsShown(board: GrowthRow[]): boolean {
  return board.length >= BOARD_MIN_SCORERS;
}

/**
 * ── ⚠⚠⚠ A RANK EXISTS ONLY WHEN THE BOARD DOES (Scott, 2026-09-22) ────────
 *
 * ⚠ AT THE WS-C GATE: *"the rank follows ruling 6. When the board is hidden…
 * the Grow card one-liner and the Grow page show no rank."*
 * ⚠⚠ THE REASON IS THAT `#1` IS A CLAIM ABOUT A FIELD. Being first of two, on a
 * board nobody is shown, is not a standing — and printing it would be the
 * loudest number on the card, earned against nobody.
 * ⚠⚠⚠ `null` MEANS "NO RANK TO SHOW", AND IT COVERS BOTH CASES: the board is
 * hidden, or the person is not on it. Neither is rank 0, and the surfaces
 * render the points alone rather than a zero.
 */
export function rankFor(board: GrowthRow[], personId: string): number | null {
  if (!boardIsShown(board)) return null;
  return board.find((r) => r.personId === personId)?.rank ?? null;
}

/**
 * The board, highest first.
 *
 * ── ⚠⚠ WHO IS RANKED (premise 7) ─────────────────────────────────────────
 *
 * ⚠ Proposed in the brief and BUILT AS PROPOSED: anyone with a login can grow
 * the network, but system admins are excluded from RANKING. ⚠⚠ A Panameer
 * employee topping the members' leaderboard is the staff-wins-the-raffle
 * problem, and it is the one exclusion that needs no judgement call.
 * ⚠⚠⚠ SEED PERSONAS ARE **NOT** EXCLUDED, AND THAT IS DELIBERATE: there is no
 * durable way to tell a seeded member from a real one (`E548` — no column
 * records where a row was written), and a name-list exclusion is exactly what
 * load-bearing rule 10 forbids. ⚠ Reported rather than guessed at.
 *
 * ⚠⚠ ONLY PEOPLE WITH A NON-ZERO SCORE APPEAR. A board of everyone with 0
 * points is a directory, not a leaderboard.
 */
export async function growthBoard(
  window: GrowthWindow = "month",
  now = new Date()
): Promise<GrowthRow[]> {
  const { from, to } = windowRange(window, now);
  const range = dateFilter(from, to);

  /* ⚠ ONE QUERY FOR THE CANDIDATES — every person who has sent an invite in the
     window. Nobody else can have a score, because every term above counts
     `colleague_invites` rows owned by an inviter. */
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
