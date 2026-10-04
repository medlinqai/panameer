import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";

export const FOLLOWER_COUNT_FLOOR = 25;

export async function personIdFor(viewer: Viewer): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { person: { select: { id: true } } },
  });
  return u?.person?.id ?? null;
}

export async function isFollowing(viewer: Viewer | null): Promise<boolean> {
  if (!viewer) return false;
  const personId = await personIdFor(viewer);
  if (!personId) return false;
  const row = await prisma.workTrackerFollower.findUnique({ where: { person_id: personId } });
  return row !== null;
}

export async function follow(viewer: Viewer, weeklyEmail?: boolean): Promise<void> {
  const personId = await personIdFor(viewer);
  if (!personId) return;
  await prisma.workTrackerFollower.upsert({
    where: { person_id: personId },
    update: weeklyEmail === undefined ? {} : { weekly_email: weeklyEmail },
    create: { person_id: personId, weekly_email: weeklyEmail === true },
  });
}

export async function unfollow(viewer: Viewer): Promise<void> {
  const personId = await personIdFor(viewer);
  if (!personId) return;
  await prisma.workTrackerFollower.deleteMany({ where: { person_id: personId } });
}

export async function followerCount(): Promise<number> {
  return prisma.workTrackerFollower.count();
}

export async function notifyFollowers(
  event: "work_tracker.shipped" | "work_tracker.gate_passed" | "work_tracker.milestone",
  vars: Record<string, string | number | null | undefined>,
  dedupeKey: string
): Promise<number> {
  const rows = await prisma.workTrackerFollower.findMany({ select: { person_id: true } });
  for (const r of rows) {
    await notify({ event, personId: r.person_id, vars, dedupeKey });
  }
  return rows.length;
}
