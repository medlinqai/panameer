import { prisma } from "@/lib/prisma";
import { connectLearn } from "@/lib/dashboard/progress";
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
  return { key, title, sub, href, seeAllLabel: cta, center: `${done}/${items.length}`, checklist: items, slices: [{ label: "Complete", n: done, color: C.ink }, { label: "To Do", n: items.length - done, color: "#C9CDDC" }] };
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

/** Learn: Matched to You isn't tracked yet (no course ↔ profile-skill mapping). */
export async function learnDonut(personId: string, side: "buyer" | "provider"): Promise<Donut> {
  const c = (await connectLearn([personId], new Date(0), new Date())).get(personId);
  const howTo = side === "buyer" ? await prisma.learningPath.count({ where: { status: "PUBLISHED", audience: "END_USER" } }) : 0;
  return {
    key: "learn", title: "Learn", sub: side === "buyer" ? "How Panameer works" : "Courses and certifications", href: "/learn",
    ...(side === "buyer" ? { lead: { text: `${howTo} buyer how-to path${howTo === 1 ? "" : "s"}`, href: "/learn", label: "Browse" } } : {}),
    slices: [
      { label: "Matched to You", n: 0, color: C.grey, untracked: true },
      { label: "Enrolled", n: c?.enrolled ?? 0, color: C.steel, href: "/learn" },
      { label: side === "buyer" ? "Finished" : "Taken", n: c?.taken ?? 0, color: C.ink, href: "/learn" },
      ...(side === "provider" ? [{ label: "Certified", n: c?.certified ?? 0, color: C.ok, href: "/learn" }] : []),
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
