import { prisma } from "@/lib/prisma";
import { C, type Donut } from "@/lib/dashboard/types";

// JR-E007: the Connect pie — zero slices are hidden. Introductions have no data source yet (0).
export async function connectDonut(userId: string, personId: string): Promise<Donut> {
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const kinds = { kind: { in: ["COLLEAGUE", "MENTOR"] as ("COLLEAGUE" | "MENTOR")[] } };
  const [connections, toMe, sent, invites, recommend] = await Promise.all([
    prisma.connection.count({ where: { ...kinds, status: "ACCEPTED", OR: [{ from_user_id: userId }, { to_user_id: userId }] } }),
    prisma.connection.count({ where: { ...kinds, status: "PENDING", to_user_id: userId } }),
    prisma.connection.count({ where: { ...kinds, status: "PENDING", from_user_id: userId } }),
    prisma.invitationToJoin.count({ where: { inviter_person_id: personId, status: "PENDING" } }),
    me?.email ? prisma.recommendationRequest.count({ where: { contact_email: { equals: me.email, mode: "insensitive" }, status: "SENT", expires_at: { gt: new Date() } } }) : 0,
  ]);
  const slices = [
    { label: "Connections", n: connections, color: C.ok, href: "/connect/connections" },
    { label: "Requests to Connect", n: toMe, color: C.pend, mine: true, href: "/connect/connections" },
    { label: "Requests Sent", n: sent, color: C.steel, href: "/connect/connections" },
    { label: "Invites to Join", n: invites, color: C.grey, href: "/connect/invite" },
    { label: "Requests to Recommend", n: recommend, color: C.no, mine: true, href: "/connect/recommendations" },
    { label: "Introductions", n: 0, color: C.okSoft, href: "/connect/community" },
  ].filter((s) => s.n > 0);
  return { key: "connect", title: "Connect", sub: "Your network", slices, href: "/connect/connections" };
}
