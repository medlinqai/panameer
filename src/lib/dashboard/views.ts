import { prisma } from "@/lib/prisma";
import { connectDonut } from "@/lib/dashboard/connect";
import { C, type Donut, type ChecklistItem } from "@/lib/dashboard/types";

// HT-E004/E005: At a Glance has two views — "start" (Get Sold / Get Started) and "work" (Make Money / Get Work Done).
export type DashView = "start" | "work";
const RELEASED = ["RELEASED", "ACTIVE", "ON_HOLD", "CLOSED", "FINALLY_CLOSED"] as const;

/** The default follows the stage (first released Order); the person's pick wins. */
export async function dashView(personId: string, side: "buyer" | "provider"): Promise<{ view: DashView; firstOrder: boolean }> {
  const [p, n] = await Promise.all([
    prisma.person.findUnique({ where: { id: personId }, select: { dashboard_view: true } }),
    prisma.workOrder.count({ where: { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), status: { in: [...RELEASED] } } }),
  ]);
  const pick = p?.dashboard_view === "start" || p?.dashboard_view === "work" ? p.dashboard_view : null;
  return { view: pick ?? (n > 0 ? "work" : "start"), firstOrder: n > 0 };
}

const ring = (key: string, title: string, sub: string, items: ChecklistItem[], href: string, cta: string): Donut => {
  const done = items.filter((i) => i.n > 0).length;
  return { key, title, sub, href, seeAllLabel: cta, center: `${done}/${items.length}`, checklist: items, slices: [{ label: "Complete", n: done, color: C.ink }, { label: "To Do", n: items.length - done, color: C.empty }] };
};

/** Seller Profile: 6 elements, each with its count or Add / Ask. */
export async function profileChecklist(personId: string): Promise<ChecklistItem[]> {
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { id: true } });
  if (!pp) return [];
  const id = pp.id;
  const [employers, skills, creds, specs, edu, recs] = await Promise.all([
    prisma.employer.count({ where: { provider_profile_id: id } }),
    prisma.providerSkill.count({ where: { provider_profile_id: id } }),
    prisma.credential.count({ where: { provider_profile_id: id } }),
    prisma.providerProfileSpecialization.count({ where: { provider_profile_id: id } }),
    prisma.education.count({ where: { provider_profile_id: id } }),
    prisma.recommendationRequest.count({ where: { provider_profile_id: id, status: "SUBMITTED" } }),
  ]);
  return [
    { label: "Companies", n: employers, href: "/profile/edit/work-history", action: "Add", why: "Buyers look for where you've worked" },
    { label: "Skills", n: skills, href: "/profile/edit/skills", action: "Add", why: "Matches come from your skills" },
    { label: "Credentials", n: creds, href: "/profile/edit/certifications", action: "Add", why: "Certifications set you apart" },
    { label: "Specializations", n: specs, href: "/profile/edit/specializations", action: "Add", why: "Buyers filter on them" },
    { label: "Education", n: edu, href: "/profile/edit/education", action: "Add", why: "Buyers filter on it" },
    { label: "Recommendations", n: recs, href: "/connect/recommendations", action: "Ask", why: "Profiles with one get picked more often" },
  ];
}

/** Buyer Account set-up: 6 elements. ERP is optional — it counts toward set-up but never blocks buying. */
export async function accountChecklist(personId: string): Promise<ChecklistItem[]> {
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { company_id: true, company: { select: { p_account_id: true } } } });
  const cid = p?.company_id ?? null;
  const pa = p?.company?.p_account_id ?? null;
  const [sites, team, approver, erp, pay] = await Promise.all([
    cid ? prisma.site.count({ where: { company_id: cid } }) : 0,
    cid ? prisma.companyMembership.count({ where: { company_id: cid, status: "APPROVED" } }) : 0,
    prisma.requesterProfile.count({ where: { person_id: personId, approver_email: { not: null } } }),
    pa ? prisma.erpConnection.count({ where: { p_account_id: pa, active: true } }) : 0,
    prisma.billingMethod.count({ where: { person_id: personId } }),
  ]);
  return [
    { label: "Company", n: cid ? 1 : 0, href: "/company", action: "Add", why: "Who providers work for" },
    { label: "Sites", n: sites, href: "/company/addresses", action: "Add", why: "Where the work happens" },
    { label: "Team", n: team, href: "/company/people", action: "Add", why: "Who buys with you" },
    { label: "Approvers", n: approver, href: "/join/requester/steps", action: "Add", why: "Requests need one before an Order" },
    { label: "ERP Connection", n: erp, href: "/erp/connect", action: "Connect", why: "Optional · order from your own system" },
    { label: "Payment Method", n: pay, href: "/settings/billing", action: "Add", why: "Needed to settle Orders" },
  ];
}

export const profileDonut = (items: ChecklistItem[]) => ring("profile", "Profile", "What buyers see", items, "/profile", "Edit Profile");
export const accountDonut = (items: ChecklistItem[]) => ring("account", "Account", "What providers see", items, "/company", "Finish Set-Up");

/** Scott 10-27: the Learn tile, six lines (pairs "a / b"); the ring is your learning (finished · in progress · matched). */
export async function learnDonut(personId: string, side: "buyer" | "provider"): Promise<Donut> {
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { user_id: true } });
  const { learnCatalog } = await import("@/lib/learn-catalog");
  const { recommendNext } = await import("@/lib/learn-next");
  const catalog = await learnCatalog(person?.user_id ?? null);
  const matched = person?.user_id ? (await recommendNext(person.user_id, { paths: catalog, limit: 50 })).picks.filter((p) => !p.path.mine?.enrolled).length : 0;
  const enrolled = catalog.filter((p) => p.mine?.enrolled);
  const finished = enrolled.filter((p) => p.mine && p.mine.total > 0 && p.mine.done >= p.mine.total).length;
  const courses = catalog.flatMap((p) => p.courses);
  const taken = courses.filter((c) => { const n = c.lessons.filter((l) => l.playable).length; return n > 0 && c.done >= n; }).length;
  const certified = catalog.filter((p) => p.certificate).length;
  const instructors = new Set(catalog.map((p) => p.teacher?.personId).filter(Boolean)).size;
  const lpGroups = new Set(catalog.map((p) => p.group).filter(Boolean)).size;
  return {
    key: "learn", title: "Learn", sub: side === "buyer" ? "How Panameer works" : "Courses and certifications", href: "/learn",
    ring: [{ label: "Finished", n: finished, color: C.ok }, { label: "In Progress", n: enrolled.length - finished, color: C.steel }, { label: "Matched", n: matched, color: C.grey }],
    slices: [
      { label: "Learning Paths", n: catalog.length, color: C.ink, href: "/learn/paths" },
      { label: "Matched to You", n: matched, color: C.grey, mine: true, href: "/learn/paths" },
      { label: "Enrolled / Finished", n: enrolled.length, value: `${enrolled.length} / ${finished}`, color: C.steel, href: "/learn/my" },
      { label: "Courses Taken / Total Courses", n: taken, value: `${taken} / ${courses.length}`, color: C.pendSoft, href: "/learn/courses" },
      { label: "Certified", n: certified, color: C.ok, href: "/learn/certificates" },
      { label: "Instructors / LP Groups", n: instructors, value: `${instructors} / ${lpGroups}`, color: C.okSoft, href: "/learn/paths" },
    ],
  };
}

export async function getStartedDonuts(viewer: { userId: string }, personId: string, side: "buyer" | "provider", jobs: Donut | undefined, checklist: ChecklistItem[]): Promise<Donut[]> {
  const first = side === "buyer" ? accountDonut(checklist) : profileDonut(checklist);
  let j = jobs;
  if (side === "buyer" && jobs) {
    const providers = await prisma.providerProfile.count();
    j = { ...jobs, lead: { text: `${providers.toLocaleString("en-US")} providers on Panameer`, href: "/connect/community", label: "Find People" } };
  }
  const [connect, learn] = await Promise.all([connectDonut(viewer.userId, personId), learnDonut(personId, side)]);
  return [first, connect, learn, ...(j ? [j] : [])];
}
