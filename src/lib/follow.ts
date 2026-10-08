import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import type { Viewer } from "@/lib/access";

// Follow (2026-10-08): one-way, no approval, independent of colleague/mentor. R1 = list + count only (no feed).
export async function followUser(viewer: Viewer, toUserId: string) {
  if (viewer.userId === toUserId) throw new Error("You can't follow yourself.");
  const target = await prisma.person.findFirst({ where: { user_id: toUserId }, select: { id: true } });
  if (!target) throw new Error("That person isn't on Panameer.");
  const key = { from_user_id_to_user_id_kind: { from_user_id: viewer.userId, to_user_id: toUserId, kind: "FOLLOW" as const } };
  const existing = await prisma.connection.findUnique({ where: key, select: { id: true } });
  if (existing) return existing;
  const row = await prisma.connection.create({ data: { from_user_id: viewer.userId, to_user_id: toUserId, kind: "FOLLOW", status: "ACCEPTED", responded_at: new Date() }, select: { id: true } });
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { first_name: true, last_name: true } });
  await notify({
    event: "follow.received",
    personId: target.id,
    entityType: "connection",
    entityId: row.id,
    dedupeKey: `follow:${viewer.userId}:${toUserId}`,
    vars: { fromName: [me?.first_name, me?.last_name].filter(Boolean).join(" ") || "Someone" },
  });
  return row;
}

export async function unfollowUser(viewer: Viewer, toUserId: string) {
  await prisma.connection.deleteMany({ where: { from_user_id: viewer.userId, to_user_id: toUserId, kind: "FOLLOW" } });
}

export async function followState(viewerUserId: string | null, userId: string) {
  const [followers, mine] = await Promise.all([
    prisma.connection.count({ where: { to_user_id: userId, kind: "FOLLOW", status: "ACCEPTED" } }),
    viewerUserId ? prisma.connection.findFirst({ where: { from_user_id: viewerUserId, to_user_id: userId, kind: "FOLLOW" }, select: { id: true } }) : null,
  ]);
  return { followers, following: !!mine };
}
