import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";

/**
 * ⚠⚠⚠ FOLLOWERS OF THE BUILD (`P2-ALL-E758`).
 *
 * Scott, 2026-10-02: *"add followers to the public status page … if you create
 * an account you will get notifications as we progress."*
 *
 * ⚠ **THE PERSON IS RESOLVED FROM THE SESSION, NEVER FROM THE CLIENT** — load-
 * bearing rule 5. Nothing here takes a person id as an argument from a route.
 *
 * ⚠⚠ **FOLLOWING IS IDEMPOTENT BY THE SCHEMA** (`person_id` is unique), not by
 * this module remembering to check — so a double-click, a replayed request and a
 * re-applied sign-up intent all land on one row.
 */

/** ⚠ Below this, the count is HIDDEN rather than shown small (the brief). A
 *  "3 people following" line makes a young page look emptier than silence does. */
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

/**
 * `weeklyEmail` is opt-in and NEVER implied (`P2-ALL-E818`). Following is
 * watching a page; it is not consent to be mailed, and an existing follower is
 * untouched when the flag is absent.
 */
export async function follow(viewer: Viewer, weeklyEmail?: boolean): Promise<void> {
  const personId = await personIdFor(viewer);
  /* ⚠ A user with no Person cannot be notified, so there is nothing to record.
     Silently doing nothing is right: the button is an offer, not a transaction. */
  if (!personId) return;
  await prisma.workTrackerFollower.upsert({
    where: { person_id: personId },
    /* Only written when the caller said so: `undefined` leaves an existing
       follower's choice exactly as they set it. */
    update: weeklyEmail === undefined ? {} : { weekly_email: weeklyEmail },
    create: { person_id: personId, weekly_email: weeklyEmail === true },
  });
}

export async function unfollow(viewer: Viewer): Promise<void> {
  const personId = await personIdFor(viewer);
  if (!personId) return;
  /* ⚠⚠ DELETE, NOT A FLAG. Someone who unfollows has withdrawn consent to be
     notified; the honest record of that is no record. ⚠ `deleteMany` so
     unfollowing when not following is not an error — the end state is what they
     asked for. */
  await prisma.workTrackerFollower.deleteMany({ where: { person_id: personId } });
}

export async function followerCount(): Promise<number> {
  return prisma.workTrackerFollower.count();
}

/**
 * ⚠⚠⚠ THE FAN-OUT. One `notify()` per follower, which is the house pipe —
 * `notify()` owns the row, the member's preference and (one day) the channel.
 *
 * ⚠⚠ **IT SENDS NO EMAIL TODAY AND THAT IS NOT AN ACCIDENT:** none of the three
 * `work_tracker.*` keys is on `NOTIFICATION_EMAIL_EVENTS`, so each call writes a
 * bell row and stops. ⚠ Adding a key there is the one-line diff that mails real
 * members from a database that also serves production — it is a product
 * decision and it is Scott's.
 *
 * ⚠ `dedupeKey` is the subject, so re-publishing the same entry cannot notify
 * twice.
 */
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
