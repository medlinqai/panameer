import { prisma } from "@/lib/prisma";
import { getMyCommunity } from "@/lib/connections";
import { getCommunitySignal } from "@/lib/community-signal";
import { ownedProviderProfile } from "@/lib/access";
import type { Viewer } from "@/lib/access";

export async function getMentoringHome(viewer: Viewer) {
  const mine = await getMyCommunity(viewer);

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true, open_for_mentoring: true },
  });

  const me = viewer.userId;
  const followerRows = await prisma.connection.findMany({
    where: { kind: "MENTOR", to_user_id: me },
    orderBy: { created_at: "desc" },
    select: { id: true, from_user_id: true, created_at: true },
  });
  const followerIds = followerRows.map((r) => r.from_user_id);
  const followerPeople = followerIds.length
    ? await prisma.person.findMany({
        where: { user: { is: { id: { in: followerIds }, is_active: true, is_test: false } } },
        select: {
          first_name: true,
          last_name: true,
          title: true,
          photo_url: true,
          user: { select: { id: true } },
        },
      })
    : [];
  const byUser = new Map(followerPeople.filter((p) => p.user).map((p) => [p.user!.id, p]));

  const followers = followerRows
    .map((r) => {
      const p = byUser.get(r.from_user_id);
      if (!p) return null;
      return {
        connectionId: r.id,
        userId: r.from_user_id,
        name: `${p.first_name} ${p.last_name}`.trim(),
        title: p.title,
        photoUrl: p.photo_url,
        since: r.created_at,
      };
    })
    .filter(Boolean) as {
    connectionId: string;
    userId: string;
    name: string;
    title: string | null;
    photoUrl: string | null;
    since: Date;
  }[];

  // THE SIGNAL READS `marked_helpful_at` AND ONLY THAT ( WS-B ruling).
  const signal = person ? await getCommunitySignal(person.id) : null;

  return {
    /** NULL when the viewer has no provider profile — the toggle is theirs. */
    openForMentoring: profile?.open_for_mentoring ?? null,
    followers,
    /** MENTORS I FOLLOW. Following is not being mentored. */
    followingMentors: mine.following
      .filter((f) => f.person)
      .map((f) => ({
        connectionId: f.connectionId,
        userId: f.person!.userId,
        name: f.person!.name,
        title: f.person!.title,
        photoUrl: f.person!.photoUrl,
      })),
    helpfulAnswers: signal?.helpfulAnswers ?? 0,
  };
}

/** THE MENTOR SIGNAL FOR A SET OF PEOPLE WS-C2) */
export async function helpfulAnswersByPerson(
  personIds: string[]
): Promise<Map<string, number>> {
  if (personIds.length === 0) return new Map();
  // SELECT-THEN-COUNT, NOT A `where` FILTER ON THE COLUMN, AND THAT IS
  const posts = await prisma.forumPost.findMany({
    where: { author_id: { in: personIds } },
    select: { author_id: true, marked_helpful_at: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    if (p.marked_helpful_at === null) continue;
    counts.set(p.author_id, (counts.get(p.author_id) ?? 0) + 1);
  }
  return counts;
}
