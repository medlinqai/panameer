import { prisma } from "@/lib/prisma";
import { getMyCommunity } from "@/lib/connections";
import { getCommunitySignal } from "@/lib/community-signal";
import { ownedProviderProfile } from "@/lib/access";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ THE MENTORING PANELS (`P2-J3-E558` WS-C1) ──────────────────────────
 *
 * ⚠⚠ THE LABELS ARE THE RULING, NOT DECORATION. Scott, 2026-09-18:
 *   · `Members Following You as a Mentor` — ⚠ NOT *"People You Mentor"*. The old
 *     label asserts a relationship the person never agreed to. This panel is
 *     DEMAND: who has raised a hand, so the mentor can see the ask.
 *   · `Mentors You Follow` — ⚠ NOT *"People Who Mentor You"*. Same reason, other
 *     direction: FOLLOWING SOMEONE IS NOT BEING MENTORED BY THEM.
 *
 * ⚠ `ConnectionKind.MENTOR` IS A FOLLOW. `followMentor`/`unfollowMentor`,
 * `ACCEPTED` at creation because *"There was a response — it is 'none needed'."*
 * ⚠⚠ NO PENDING STATE WAS ADDED AND NONE IS WANTED. The consent lives on
 * `ProviderProfile.open_for_mentoring`, set once by the provider.
 */
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

  /* ⚠⚠ WHO FOLLOWS ME AS A MENTOR — the mirror of `following`. `getMyCommunity`
     returns only a COUNT for this (`mentorConnectionCount`), because before
     `E558` there was no surface that could act on the names. ⚠ The mentor needs
     the NAMES now: seeing demand is the entire point of the panel. */
  const me = viewer.userId;
  const followerRows = await prisma.connection.findMany({
    where: { kind: "MENTOR", to_user_id: me },
    orderBy: { created_at: "desc" },
    select: { id: true, from_user_id: true, created_at: true },
  });
  const followerIds = followerRows.map((r) => r.from_user_id);
  const followerPeople = followerIds.length
    ? await prisma.person.findMany({
        where: { user: { is: { id: { in: followerIds } } } },
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

  /*
    ⚠⚠ THE SIGNAL READS `marked_helpful_at` AND ONLY THAT (`E558` WS-B ruling).
    `instructor_confirmed_*` does NOT feed it — an instructor's CORRECTNESS
    judgement is not the asker's RESOLUTION judgement, and mixing them would
    make this number's label false in the flattering direction.
    ⚠ WITH ZERO `ForumThread` ROWS THIS IS 0 FOR EVERYONE. That is the honest
    state, and it renders at 0 rather than hiding: nobody buys time with a
    mentor they cannot evaluate.
  */
  const signal = person ? await getCommunitySignal(person.id) : null;

  return {
    /** ⚠ NULL when the viewer has no provider profile — the toggle is theirs. */
    openForMentoring: profile?.open_for_mentoring ?? null,
    followers,
    /** ⚠ MENTORS I FOLLOW. Following is not being mentored. */
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
