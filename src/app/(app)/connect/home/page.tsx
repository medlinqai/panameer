import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { displayFirstName } from "@/lib/display";
import { connectLines, type AttentionItem } from "@/lib/attention";
import { GROWTH_WEIGHTS, growthBoard, growthScore } from "@/lib/growth-score";
import { HubHome, RankList, VsGroup } from "@/components/home/HubHome";
import { C, type Donut } from "@/lib/dashboard/types";

export const metadata = { title: "Connect · Panameer" };

// HT-E007 / WK-E004: Connect › Home (no tab row) — At a Glance (Connections · Recommendations · Mentors · Groups) beside Things You Need to Do, then How You Rank.
export default async function ConnectHome() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fconnect%2Fhome");
  const person = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, providerProfile: { select: { id: true } } } });
  if (!person) redirect("/connect/community");
  const pid = person.id, uid = viewer.userId, ppId = person.providerProfile?.id ?? null;
  const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true } });
  const email = u?.email ? { equals: u.email, mode: "insensitive" as const } : undefined;
  const either = { OR: [{ from_user_id: uid }, { to_user_id: uid }] };
  const [connected, invitesSent, joined, toMe, received, askedFor, toRecommend, given, mentoring, mentoredBy, mentorReqs, groupsJoined, groupInvites] = await Promise.all([
    prisma.connection.count({ where: { kind: "COLLEAGUE", status: "ACCEPTED", ...either } }),
    prisma.invitationToJoin.count({ where: { inviter_person_id: pid } }),
    prisma.invitationToJoin.count({ where: { inviter_person_id: pid, accepted_at: { not: null } } }),
    prisma.connection.count({ where: { kind: "COLLEAGUE", status: "PENDING", to_user_id: uid } }),
    ppId ? prisma.recommendationRequest.count({ where: { provider_profile_id: ppId, status: "SUBMITTED" } }) : 0,
    ppId ? prisma.recommendationRequest.count({ where: { provider_profile_id: ppId, status: "SENT" } }) : 0,
    email ? prisma.recommendationRequest.count({ where: { contact_email: email, status: "SENT", expires_at: { gt: new Date() } } }) : 0,
    email ? prisma.recommendationRequest.count({ where: { contact_email: email, status: "SUBMITTED" } }) : 0,
    prisma.connection.count({ where: { kind: "MENTOR", status: "ACCEPTED", to_user_id: uid } }),
    prisma.connection.count({ where: { kind: "MENTOR", status: "ACCEPTED", from_user_id: uid } }),
    prisma.connection.count({ where: { kind: "MENTOR", status: "PENDING", to_user_id: uid } }),
    prisma.groupMembership.count({ where: { person_id: pid, state: "ACTIVE" } }),
    prisma.groupMembership.count({ where: { person_id: pid, route: "INVITED", state: "PENDING" } }),
  ]);
  const d = (key: string, title: string, sub: string, href: string, slices: Donut["slices"]): Donut => ({ key, title, sub, href, slices });
  const donuts: Donut[] = [
    d("connections", "Connections", "Who you know", "/connect/connections", [
      { label: "Connected", n: connected, color: C.ok, href: "/connect/connections" }, { label: "Invites Sent", n: invitesSent, color: C.steel, href: "/connect/invite" },
      { label: "Joined from You", n: joined, color: C.ink, href: "/connect/leaders?tab=network" }, { label: "Requests to Connect", n: toMe, color: C.pend, mine: true, href: "/connect/connections" }]),
    d("recommendations", "Recommendations", "Your proof", "/connect/recommendations", [
      { label: "Received", n: received, color: C.ok, href: "/connect/recommendations" }, { label: "Asked For", n: askedFor, color: C.steel, href: "/connect/recommendations" },
      { label: "Requests to Recommend", n: toRecommend, color: C.pend, mine: true, href: "/connect/recommendations" }, { label: "Given", n: given, color: C.ink, href: "/connect/recommendations" }]),
    d("mentors", "Mentors", "Who helps whom", "/connect/mentors", [
      { label: "Mentoring", n: mentoring, color: C.ok, href: "/connect/mentors" }, { label: "Mentored By", n: mentoredBy, color: C.ink, href: "/connect/mentors" },
      { label: "Mentor Requests", n: mentorReqs, color: C.pend, mine: true, href: "/connect/mentors" }]),
    d("groups", "Groups", "Where you talk shop", "/connect/groups", [
      { label: "Joined", n: groupsJoined, color: C.ok, href: "/connect/groups" }, { label: "New Posts", n: 0, color: C.steel, untracked: true },
      { label: "Invites", n: groupInvites, color: C.pend, mine: true, href: "/connect/groups" }]),
  ];
  // Things You Need to Do — one line each, grouped.
  const lines = await connectLines(uid, pid);
  const todo: AttentionItem[] = [];
  for (const g of ["Requests to Connect", "Recommendations", "Mentors & Groups"] as const) {
    const ls = lines.filter((x) => x.group === g).map((x) => x.line);
    if (g === "Recommendations" && ppId && received === 0) ls.push({ key: "ask", what: "Ask a Past Client for One", detail: "Profiles with one get picked more often", dueAt: null, href: "/connect/recommendations", action: "Ask" });
    if (ls.length) todo.push({ id: `connect:${g}`, title: g, n: ls.length, what: g, app: "connect", appLabel: "Connect", due: null, dueAt: null, href: ls[0].href, action: "Open", lines: ls });
  }
  // 2 · How You Rank: Leaders top 3 + your row, How It Adds Up, you vs the group.
  const [me, board, groupAvg] = await Promise.all([growthScore(pid, "month"), growthBoard("month"), groupAverages()]);
  const mine = board.find((r) => r.personId === pid);
  const waiting = toMe + toRecommend + mentorReqs + groupInvites;
  const pts = (n: number) => `${n} point${n === 1 ? "" : "s"}`;
  const toFirst = board[0] && board[0].personId !== pid ? board[0].points - me.points : 0;
  const first = displayFirstName(person.first_name);
  return (
    <>
      <HubHome
        eyebrow="CONNECT" title={`Your Network${first ? `, ${first}` : ""}`}
        summary={`${connected} connection${connected === 1 ? "" : "s"} · ${waiting} ${waiting === 1 ? "person" : "people"} waiting on you · ${mine && me.points > 0 ? `rank #${mine.rank} this month` : "not ranked yet this month"}`}
        primary={{ label: "Invite to Panameer", href: "/connect/invite" }} secondary={{ label: "Find People", href: "/connect/community" }}
        donuts={donuts} todo={todo} section2Title="How You Rank" section2Right="This Month"
        actions={[
          { label: "Invite to Panameer", detail: `Every colleague who joins adds ${GROWTH_WEIGHTS.JOINED} points`, href: "/connect/invite" },
          { label: "Find People", detail: "Buyers and providers you're not connected to yet", href: "/connect/community" },
          { label: "Ask for a Recommendation", detail: "Profiles with one get picked more often", href: "/connect/recommendations" },
          { label: "Join a Group", detail: "Talk shop with people in your field", href: "/connect/groups" },
          { label: "See the Leaders", detail: "Who's growing the community this month", href: "/connect/leaders" },
        ]}
        section2={<>
          <RankList eyebrow="LEADERS" title="Who's Growing the Community" rows={board.slice(0, 3).map((r) => ({ rank: r.rank, name: r.name, photoUrl: r.photoUrl, line: `${r.invited} invited · ${r.joined} joined`, value: r.points, me: r.personId === pid }))}
            me={{ rank: mine && me.points > 0 ? mine.rank : null, name: "You", photoUrl: null, line: `${me.invited} invited · ${me.joined} joined`, value: me.points, me: true }} />
          <div className="rounded-[12px] border border-line bg-white p-4" data-score-breakdown>
            <p className="text-[10.5px] font-bold tracking-[0.12em] text-ink-3">YOUR SCORE</p>
            <h3 className="text-[15px] font-extrabold">How It Adds Up</h3>
            <div className="mt-2 space-y-1 text-[13px]">
              <p className="flex justify-between"><span className="text-ink-2">Invited · {me.invited} × {GROWTH_WEIGHTS.INVITED}</span><b>{me.invited * GROWTH_WEIGHTS.INVITED}</b></p>
              <p className="flex justify-between"><span className="text-ink-2">Joined · {me.joined} × {GROWTH_WEIGHTS.JOINED}</span><b>{me.joined * GROWTH_WEIGHTS.JOINED}</b></p>
              <p className="flex justify-between"><span className="text-ink-2">Became Active · {GROWTH_WEIGHTS.ACTIVE_BONUS} each</span><b title="Not tracked yet">—</b></p>
              <p className="flex justify-between border-t border-line pt-1"><span className="font-semibold">This Month</span><b>{me.points}</b></p>
            </div>
            {toFirst > 0 && <p className="mt-2 text-[12.5px] text-ink-2">{pts(toFirst)} to #1</p>}
          </div>
          <VsGroup title="Connections" rows={[["Connected", connected, groupAvg.connected], ["Recommended", received, groupAvg.recommended], ["Mentoring", mentoring, groupAvg.mentoring]]} />
        </>}
      />
    </>
  );
}

/** Average per person who has at least one (so the group isn't dragged to zero by people who never connect). */
async function groupAverages() {
  const [conns, recs, mentors] = await Promise.all([
    prisma.connection.findMany({ where: { kind: "COLLEAGUE", status: "ACCEPTED" }, select: { from_user_id: true, to_user_id: true } }),
    prisma.recommendationRequest.groupBy({ by: ["provider_profile_id"], where: { status: "SUBMITTED" }, _count: { _all: true } }),
    prisma.connection.groupBy({ by: ["to_user_id"], where: { kind: "MENTOR", status: "ACCEPTED" }, _count: { _all: true } }),
  ]);
  const people = new Set(conns.flatMap((c) => [c.from_user_id, c.to_user_id]));
  const avg = (total: number, n: number) => (n ? Math.round(total / n) : 0);
  return {
    connected: avg(conns.length * 2, people.size),
    recommended: avg(recs.reduce((n, r) => n + r._count._all, 0), recs.length),
    mentoring: avg(mentors.reduce((n, r) => n + r._count._all, 0), mentors.length),
  };
}
