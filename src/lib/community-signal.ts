import { prisma } from "@/lib/prisma";

export type CommunitySignal = {
  /** The number that means something. Leads the block. */
  helpfulAnswers: number;
  replies: number;
  threads: number;
  /** Board titles they are active in, most-active first, capped at three. */
  boards: string[];
  lastActive: string | null;
};

export async function getCommunitySignal(personId: string): Promise<CommunitySignal | null> {
  const [threads, posts] = await Promise.all([
    prisma.forumThread.findMany({
      where: { author_id: personId },
      select: { last_post_at: true, created_at: true, board: { select: { title: true } } },
    }),
    prisma.forumPost.findMany({
      where: { author_id: personId },
      select: {
        created_at: true,
        marked_helpful_at: true,
        thread: { select: { board: { select: { title: true } } } },
      },
    }),
  ]);

  if (threads.length === 0 && posts.length === 0) return null;

  const boardCounts = new Map<string, number>();
  for (const t of threads) boardCounts.set(t.board.title, (boardCounts.get(t.board.title) ?? 0) + 1);
  for (const p of posts) {
    const title = p.thread.board.title;
    boardCounts.set(title, (boardCounts.get(title) ?? 0) + 1);
  }

  const latest = [
    ...threads.map((t) => t.created_at),
    ...posts.map((p) => p.created_at),
  ].sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    helpfulAnswers: posts.filter((p) => p.marked_helpful_at !== null).length,
    replies: posts.length,
    threads: threads.length,
    boards: [...boardCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([title]) => title),
    lastActive: latest ? monthLabel(latest) : null,
  };
}

function monthLabel(at: Date, now = new Date()): string {
  if (at.getUTCFullYear() === now.getUTCFullYear() && at.getUTCMonth() === now.getUTCMonth()) {
    return "Active this month";
  }
  return `Active in ${at.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

/**
 * The signal for a PROVIDER PROFILE id, which is what the profile pages hold.
 * Returns null when the profile is gone, so a caller never has to branch twice.
 */
export async function getCommunitySignalForProfile(
  providerProfileId: string
): Promise<CommunitySignal | null> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { person_id: true },
  });
  if (!profile) return null;
  return getCommunitySignal(profile.person_id);
}

// ---------------------------------------------------------------------------
// The Mentor badge (brief_community_signal WS3)
// ---------------------------------------------------------------------------

/**
 * ⚠ HOW MANY HELPFUL ANSWERS MAKE A MENTOR — AND IT IS DELIBERATELY `null`.
 *
 * `P1-J2.4-E024` lists four MVP-R1 profile badges (validated · mentor ·
 * instructor · expert) and says Mentor *"cannot be earned because the activity
 * cannot happen."* ⚠ THAT WAS WRONG, and it is worth saying plainly rather than
 * quietly fixing: the same call cut the Mentor badge from `brief_learn_app_shell`
 * on the grounds that "there are no rooms". Forums exist, are shipped, and are
 * live at `/community/groups`. Mentor IS computable — from helpful answers, not
 * from post count, for the reason the whole of this file exists.
 *
 * ⚠ THE THRESHOLD IS SCOTT'S TO SET AND IS NOT SET HERE. `null` is not a
 * placeholder to be tidied away: it is what makes the badge structurally
 * unlightable until somebody chooses a number against a real distribution.
 * `mentorState` cannot return `earned: true` while this is null, and
 * `check:community` fails the build if a number appears without the comment
 * being rewritten.
 *
 * There is no distribution yet — measured 2026-08-19, zero people have ever
 * posted — so any number picked today would be a guess dressed as a rule.
 */
export const MENTOR_HELPFUL_THRESHOLD: number | null = null;

export type MentorState = {
  helpfulAnswers: number;
  /** ⚠ Only ever true once a threshold exists AND is met. */
  earned: boolean;
  /** The condition, in words, so the badge explains itself while it is dark. */
  detail: string;
};

/**
 * The badge's state for one person.
 *
 * `showCount` is the caller's call: the OWNER always sees the number, because it
 * is the mechanic they would be working towards; a VISITOR sees it only when it
 * is greater than zero, because "answers marked helpful: 0" on somebody else's
 * public profile is a row of zeroes with a person's name on it.
 */
export function mentorState(helpfulAnswers: number, showCount: boolean): MentorState {
  const earned =
    MENTOR_HELPFUL_THRESHOLD !== null && helpfulAnswers >= MENTOR_HELPFUL_THRESHOLD;
  return {
    helpfulAnswers,
    earned,
    detail:
      showCount || helpfulAnswers > 0
        ? `answers marked helpful: ${helpfulAnswers}`
        : "for answers marked helpful",
  };
}
