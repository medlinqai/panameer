import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import {
  BOARD_MIN_SCORERS,
  boardIsShown,
  daysLeftInMonth,
  growthBoard,
  growthScore,
  nextMove,
  rankFor,
  type GrowthScore,
} from "@/lib/growth-score";

/**
 * ── ⚠⚠⚠ THE COMMUNITY HERO'S RIGHT-HAND SIDE (`P2-A3-E601` WS-B) ──────────
 *
 * ⚠ SCOTT, 2026-09-22: *"Split-card at the top… picture on the left, the story
 * and counts on the right."* ⚠ The picture already exists (`CommunityWeb`); this
 * is the data behind the story.
 *
 * ── ⚠⚠⚠ EVERY FIELD HERE IS COUNTED. THAT IS THE WHOLE BRIEF ──────────────
 *
 * ⚠ The rulings this module is written under (`brief_community_and_grow`):
 * **there is no XP in Panameer**, and **a mockup's names and numbers are
 * illustration — nothing renders unless it was counted.**
 * ⚠⚠ SO THERE IS NO `level`, NO `xp`, NO `toNextLevel` AND NO INVENTED ACTIVITY
 * LINE ON THIS TYPE. The 9/20 mockup had all four and none of them existed.
 * ⚠⚠⚠ IF A FIELD CANNOT BE COUNTED IT IS `null`, NEVER `0` — the rule `E599`
 * settled for `active`: **a zero is a measurement and an absence is not.**
 */
export type CommunityHero = {
  /** ⚠ `E599`'s growth score for this month. Counted, never stored. */
  score: GrowthScore;
  /**
   * ⚠⚠ `null` WHEN THE BOARD IS NOT SHOWN — Scott's `E599` ruling 6, carried
   * here unchanged: *"`#1 of 2` on a board nobody is shown is a standing earned
   * against nobody."* ⚠ Fewer than `BOARD_MIN_SCORERS` scorers → no rank.
   */
  rank: number | null;
  /**
   * ⚠⚠⚠ THE THREE RANK STATES ARE NOT TWO. `rank === null` covers BOTH *"there
   * is no board"* and *"there is a board and you are not on it"*, and those
   * need different sentences: saying *"you're not on the board"* when no board
   * exists is wrong, and *"ranking starts once three members…"* to somebody
   * looking at a live board is wrong the other way.
   * ⚠ `/community/grow` already made this distinction; carrying it into the
   * shared component is what lets Grow drop its duplicate rank card.
   */
  boardShown: boolean;
  /** ⚠ How many members have a score — the *"of N"* in `#2 of 7`. Counted. */
  boardSize: number;
  /**
   * ⚠⚠ THE ONE MOVE THAT CHANGES YOUR STANDING, computed from the board and
   * never canned (`E599` WS-A 1). `null` when nobody is above you — which is
   * either leading or an empty board, both honest non-answers.
   */
  move: string | null;
  /** ⚠ Days remaining in the scoring month. Counted from the calendar. */
  daysLeft: number;
  /** ⚠ The threshold, from the lib — no page or component restates it. */
  minScorers: number;
  /**
   * ⚠⚠⚠ THE MOST RECENT **REAL** EVENT, OR `null` — AND `null` IS THE LIVE CASE.
   * ⚠ MEASURED 2026-09-22: **zero accepted invites exist in the database**, so
   * every member sees nothing here today. ⚠⚠ THE EMPTY STATE IS THE DEFAULT
   * STATE AND WAS BUILT FIRST, not bolted on — the mockup's *"Raj Bhatt just
   * joined from your invite"* is precisely the sentence this replaces.
   */
  latestJoin: { name: string; at: Date } | null;
};

export async function getCommunityHero(viewer: Viewer): Promise<CommunityHero | null> {
  /* ⚠⚠ `Viewer` CARRIES NO `personId` — it holds `userId` and the capability
     flags, nothing else. ⚠ `/community/grow` records the same trap in terms
     (*"`viewer.personId` failed to typecheck"*), so the Person is looked up the
     same way here rather than a second shape being invented.
     ⚠ A signed-in user with no Person backbone gets `null` and the hero simply
     does not render — not a zero score, which would be a measurement. */
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;
  const personId = person.id;

  const now = new Date();
  /* ⚠ The board is fetched for ONE reason — to decide whether a rank may be
     shown at all — and `rankFor` reads the same board, so the threshold and the
     rank cannot disagree. ⚠⚠ NOT re-derived here: `boardIsShown` is the rule. */
  const [score, board] = await Promise.all([
    growthScore(personId, "month", now),
    growthBoard("month", now),
  ]);

  /*
    ⚠⚠⚠ THE MOST RECENT INVITE THAT ACTUALLY PRODUCED A PERSON.
    ⚠ `accepted_person_id` IS REQUIRED, not just `status: ACCEPTED` — an invite
    can be marked accepted without the join being linked, and this line names a
    PERSON. ⚠⚠ Without that condition the sentence would have to invent a name,
    which is the exact defect this brief exists to remove.
    ⚠ `acceptedPerson` is `onDelete: SetNull`, so a deleted member leaves the
    invite's acceptance intact and this query correctly stops naming them.
  */
  const joined = await prisma.colleagueInvite.findFirst({
    where: {
      inviter_person_id: personId,
      status: "ACCEPTED",
      accepted_person_id: { not: null },
      accepted_at: { not: null },
    },
    orderBy: { accepted_at: "desc" },
    select: {
      accepted_at: true,
      acceptedPerson: { select: { first_name: true, last_name: true } },
    },
  });

  const name = joined?.acceptedPerson
    ? `${joined.acceptedPerson.first_name ?? ""} ${joined.acceptedPerson.last_name ?? ""}`.trim()
    : "";

  const shown = boardIsShown(board);
  return {
    score,
    /* ⚠ `rankFor` ALREADY returns null while the board is hidden — the guard is
       the lib's, and this reads it rather than re-deriving the threshold. */
    rank: shown ? rankFor(board, personId) : null,
    boardShown: shown,
    boardSize: board.length,
    move: nextMove(board, score)?.text ?? null,
    daysLeft: daysLeftInMonth(now),
    minScorers: BOARD_MIN_SCORERS,
    /* ⚠ A person with no readable name is not a story — better nothing than
       *"joined from your invite"* with a blank where the name goes. */
    latestJoin: name && joined?.accepted_at ? { name, at: joined.accepted_at } : null,
  };
}
