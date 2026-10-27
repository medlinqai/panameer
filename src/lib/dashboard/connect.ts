import { prisma } from "@/lib/prisma";
import { C, type Donut } from "@/lib/dashboard/types";

// Scott 10-27: the Connect tile, six lines (a line may show a pair "a / b"); the ring is the network by type.
// "Requests to Recommend" is a Worklist action only, not a line here.
export async function connectDonut(userId: string, personId: string): Promise<Donut> {
  const either = { OR: [{ from_user_id: userId }, { to_user_id: userId }] };
  const [colleagues, toMe, sentPending, sentAccepted, invites, joined, mentors, groups, paths] = await Promise.all([
    prisma.connection.count({ where: { kind: "COLLEAGUE", status: "ACCEPTED", ...either } }),
    prisma.connection.count({ where: { kind: { in: ["COLLEAGUE", "MENTOR"] }, status: "PENDING", to_user_id: userId } }),
    prisma.connection.count({ where: { kind: { in: ["COLLEAGUE", "MENTOR"] }, status: "PENDING", from_user_id: userId } }),
    prisma.connection.count({ where: { kind: { in: ["COLLEAGUE", "MENTOR"] }, status: "ACCEPTED", from_user_id: userId } }),
    prisma.invitationToJoin.count({ where: { inviter_person_id: personId } }),
    prisma.invitationToJoin.count({ where: { inviter_person_id: personId, accepted_at: { not: null } } }),
    prisma.connection.count({ where: { kind: "MENTOR", status: "ACCEPTED", ...either } }),
    prisma.groupMembership.count({ where: { person_id: personId, state: "ACTIVE" } }),
    prisma.enrollment.findMany({ where: { user_id: userId }, select: { learningPath: { select: { instructor_person_id: true } } } }),
  ]);
  const instructors = new Set(paths.map((e) => e.learningPath.instructor_person_id).filter((x): x is string => !!x && x !== personId)).size;
  return {
    key: "connect", title: "Connect", sub: "Your network", href: "/connect/home",
    ring: [{ label: "Colleagues", n: colleagues, color: C.ok }, { label: "Mentors", n: mentors, color: C.ink }, { label: "Instructors", n: instructors, color: C.steel }],
    slices: [
      { label: "Connections", n: colleagues, color: C.ok, href: "/connect/connections" },
      { label: "Requests to You", n: toMe, color: C.pend, mine: true, href: "/connect/connections" },
      { label: "Requests Sent / Accepted", n: sentPending, value: `${sentPending} / ${sentAccepted}`, color: C.steel, href: "/connect/connections" },
      { label: "Join Invites Sent / Joined", n: invites, value: `${invites} / ${joined}`, color: C.grey, href: "/connect/invite" },
      { label: "Mentor Connections", n: mentors, color: C.ink, href: "/connect/mentors" },
      { label: "Groups Joined", n: groups, color: C.okSoft, href: "/connect/groups" },
    ],
  };
}
