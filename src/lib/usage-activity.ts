import { prisma } from "@/lib/prisma";
import type { Figure } from "@/lib/figure";
import type { Statistics } from "@/lib/statistics";
import { windowRange } from "@/lib/growth-score";
import { profileSectionCounts } from "@/lib/profile-counts";
import { teachesPathWhere } from "@/lib/learn-home";

// Usage v4 "Your Activity": six areas × four metrics, goals exactly as the mockup's AREAS table.
/** `now` = a current state (same in both ranges); everything else counts what was added in the range. */
export type ActivityMetric = { label: string; value: Figure; goal: number; money?: boolean; now?: boolean };
export type ActivityArea = { key: string; title: string; go: string; href: string; sub?: string; metrics: ActivityMetric[] };
export type ActivityRange = "month" | "all";

const NC = (why: string): Figure => ({ uncounted: why });

export async function usageActivity(input: {
  range: ActivityRange;
  stats: Statistics; // getStatistics(…, range) — the shared counts
  personId: string;
  userId: string;
  profileId: string;
  searchScore: Figure;
}): Promise<ActivityArea[]> {
  const { from } = windowRange(input.range === "all" ? "all" : "month");
  const since = from ? { created_at: { gte: from } } : {};
  const pid = input.personId;
  const [counts, pathsCreated, colleagues, groups, community, won, active, posted, offers, accepts, settlements, awaiting, payouts, paid] = await Promise.all([
    profileSectionCounts(input.profileId, from),
    prisma.learningPath.count({ where: { ...teachesPathWhere(pid), ...since } }),
    prisma.connection.count({ where: { kind: "COLLEAGUE", status: "ACCEPTED", OR: [{ from_user_id: input.userId }, { to_user_id: input.userId }], ...since } }),
    prisma.groupMembership.count({ where: { person_id: pid, state: "ACTIVE", ...since } }),
    prisma.connection.count({ where: { status: "ACCEPTED", OR: [{ from_user_id: input.userId }, { to_user_id: input.userId }], ...since } }),
    prisma.workOrder.count({ where: { provider_person_id: pid, status: { notIn: ["DRAFT", "ISSUED", "CANCELLED"] }, ...since } }),
    prisma.workOrder.count({ where: { provider_person_id: pid, status: { in: ["RELEASED", "ACTIVE"] } } }),
    prisma.serviceProduct.count({ where: { provider_profile_id: input.profileId, status: "PUBLISHED", ...since } }),
    prisma.serviceProductOffer.count({ where: { provider_person_id: pid, ...since } }),
    prisma.serviceProductOffer.count({ where: { provider_person_id: pid, status: "ACCEPTED", ...since } }),
    prisma.settlementRequest.count({ where: { provider_person_id: pid, ...since } }),
    prisma.settlementRequest.count({ where: { provider_person_id: pid, status: "SUBMITTED" } }),
    prisma.providerPayout.aggregate({ where: { provider_person_id: pid, ...since }, _sum: { net_cents: true } }),
    prisma.providerPayout.aggregate({ where: { provider_person_id: pid, status: "PAID", ...since }, _sum: { net_cents: true } }),
  ]);
  const s = input.stats;
  const dollars = (c: number | null) => Math.round((c ?? 0) / 100);
  return [
    {
      key: "profile", title: "Profile", go: "Go to Profile", href: "/profile",
      metrics: [
        { label: "Skills Added", value: counts.skills, goal: 20 },
        { label: "Specializations", value: counts.specializations, goal: 10 },
        { label: "Certifications", value: counts.certifications, goal: 5 },
        { label: "Search Score", value: input.searchScore, goal: 100, now: true },
      ],
    },
    {
      key: "learn", title: "Learn", go: "Go to Learn", href: "/learn",
      metrics: [
        { label: "Paths Enrolled", value: s.learning.pathsEnrolled, goal: 5 },
        { label: "Paths Completed", value: NC("A path completion is not recorded yet"), goal: 3 },
        { label: "Instructors Messaged", value: NC("Messaging is colleague-only today"), goal: 5 },
        { label: "Paths Created", value: pathsCreated, goal: 3 },
      ],
    },
    {
      key: "connect", title: "Connect", go: "Go to Connect", href: "/connect/community",
      metrics: [
        { label: "Invites Sent", value: s.network.invitesSent, goal: 10 },
        { label: "Colleagues", value: colleagues, goal: 25 },
        { label: "Groups Joined", value: groups, goal: 5 },
        { label: "Total Community", value: community, goal: 100 },
      ],
    },
    {
      key: "work", title: "Work", go: "Go to Work", href: "/find-work", sub: "As a provider",
      metrics: [
        { label: "Proposals Sent", value: s.work.proposalsSent, goal: 10 },
        { label: "Interviews", value: s.work.interviews, goal: 5 },
        { label: "Contracts Won", value: won, goal: 5 },
        { label: "Active Engagements", value: active, goal: 5, now: true },
      ],
    },
    {
      key: "shop", title: "Shop", go: "Go to Shop", href: "/shop",
      metrics: [
        { label: "Service Products Posted", value: posted, goal: 10 },
        { label: "Offers", value: offers, goal: 10 },
        { label: "Accepts", value: accepts, goal: 5 },
        { label: "Products Deployed / Billing", value: NC("Nothing records a deployment yet"), goal: 5 },
      ],
    },
    {
      key: "pay", title: "Pay", go: "Go to Payments", href: "/payments",
      metrics: [
        { label: "Settlement Requests", value: settlements, goal: 5 },
        { label: "Earnings", value: dollars(payouts._sum.net_cents), goal: 10_000, money: true },
        { label: "Awaiting Approval", value: awaiting, goal: 5, now: true },
        { label: "Paid Out", value: dollars(paid._sum.net_cents), goal: 5_000, money: true },
      ],
    },
  ];
}
