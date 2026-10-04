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

export type CommunityHero = {
  score: GrowthScore;
  rank: number | null;
  boardShown: boolean;
  boardSize: number;
  move: string | null;
  daysLeft: number;
  minScorers: number;
  latestJoin: { name: string; at: Date } | null;
};

export async function getCommunityHero(viewer: Viewer): Promise<CommunityHero | null> {
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;
  const personId = person.id;

  const now = new Date();
  const [score, board] = await Promise.all([
    growthScore(personId, "month", now),
    growthBoard("month", now),
  ]);

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
