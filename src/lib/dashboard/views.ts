import { prisma } from "@/lib/prisma";
import { connectDonut } from "@/lib/dashboard/connect";
import { C, type Donut, type ChecklistItem } from "@/lib/dashboard/types";

// HT-E004/E005: At a Glance has two views — "start" (Get Started) and "work" (Make Money / Get Work Done).
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

// RM-E005: the Learn tile from database counts — the platform totals are cached for 10 minutes (apart from the
// per-person tile cache); the person's own counts are a few small queries. No full catalog read.
const LEARN_TTL_MS = 10 * 60_000;
let learnTotals: { at: number; paths: number; courses: number; instructors: number; groups: number; lessonPath: Map<string, string>; lessonCourse: Map<string, string>; perPath: Map<string, number>; perCourse: Map<string, number> } | null = null;
async function catalogTotals() {
  if (learnTotals && learnTotals.at > Date.now() - LEARN_TTL_MS) return learnTotals;
  const { isPlayable } = await import("@/lib/learn");
  const paths = await prisma.learningPath.findMany({ where: { status: "PUBLISHED" }, select: { id: true, group: true, instructor_person_id: true, courses: { select: { id: true, sections: { select: { lessons: { where: { retired_at: null }, select: { id: true, vimeo_ref: true, production_status: true } } } } } } } });
  const lessonPath = new Map<string, string>(), lessonCourse = new Map<string, string>(), perPath = new Map<string, number>(), perCourse = new Map<string, number>();
  for (const p of paths) for (const c of p.courses) for (const l of c.sections.flatMap((x) => x.lessons).filter(isPlayable)) {
    lessonPath.set(l.id, p.id); lessonCourse.set(l.id, c.id);
    perPath.set(p.id, (perPath.get(p.id) ?? 0) + 1); perCourse.set(c.id, (perCourse.get(c.id) ?? 0) + 1);
  }
  learnTotals = { at: Date.now(), paths: paths.length, courses: paths.reduce((n, p) => n + p.courses.length, 0), instructors: new Set(paths.map((p) => p.instructor_person_id).filter(Boolean)).size, groups: new Set(paths.map((p) => p.group).filter(Boolean)).size, lessonPath, lessonCourse, perPath, perCourse };
  return learnTotals;
}

/** Scott 10-27: the Learn tile, six lines (pairs "a / b"); the ring is your learning (finished · in progress · matched). */
export async function learnDonut(personId: string, side: "buyer" | "provider"): Promise<Donut> {
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { user_id: true, providerProfile: { select: { skills: { select: { skill_id: true } } } } } });
  const uid = person?.user_id ?? null;
  const skillIds = person?.providerProfile?.skills.map((s) => s.skill_id) ?? [];
  const [t, enrollments, progress, certified, skillPaths] = await Promise.all([
    catalogTotals(),
    uid ? prisma.enrollment.findMany({ where: { user_id: uid, learningPath: { status: "PUBLISHED" } }, select: { learning_path_id: true } }) : [],
    uid ? prisma.lessonProgress.findMany({ where: { user_id: uid }, select: { lesson_id: true } }) : [],
    uid ? prisma.certificationAttempt.findMany({ where: { user_id: uid, passed: true, is_preview: false }, distinct: ["learning_path_id"], select: { learning_path_id: true } }) : [],
    skillIds.length ? prisma.learningPathSkill.findMany({ where: { skill_id: { in: skillIds }, learningPath: { status: "PUBLISHED" } }, distinct: ["learning_path_id"], select: { learning_path_id: true } }) : [],
  ]);
  const doneByPath = new Map<string, number>(), doneByCourse = new Map<string, number>();
  for (const p of progress) {
    const path = t.lessonPath.get(p.lesson_id), course = t.lessonCourse.get(p.lesson_id);
    if (path) doneByPath.set(path, (doneByPath.get(path) ?? 0) + 1);
    if (course) doneByCourse.set(course, (doneByCourse.get(course) ?? 0) + 1);
  }
  const enrolledIds = new Set(enrollments.map((e) => e.learning_path_id));
  const finished = [...enrolledIds].filter((id) => (t.perPath.get(id) ?? 0) > 0 && (doneByPath.get(id) ?? 0) >= t.perPath.get(id)!).length;
  const taken = [...doneByCourse].filter(([id, n]) => n >= (t.perCourse.get(id) ?? Infinity)).length;
  // Matched to You: published paths that teach one of your profile skills and that you haven't enrolled in.
  const matched = skillPaths.filter((p) => !enrolledIds.has(p.learning_path_id)).length;
  const enrolled = enrolledIds.size;
  return {
    key: "learn", title: "Learn", sub: side === "buyer" ? "How Panameer works" : "Courses and certifications", href: "/learn",
    ring: [{ label: "Finished", n: finished, color: C.ok }, { label: "In Progress", n: enrolled - finished, color: C.steel }, { label: "Matched", n: matched, color: C.grey }],
    slices: [
      { label: "Learning Paths", n: t.paths, color: C.ink, href: "/learn/paths" },
      { label: "Matched to You", n: matched, color: C.grey, mine: true, href: "/learn/paths" },
      { label: "Enrolled / Finished", n: enrolled, value: `${enrolled} / ${finished}`, color: C.steel, href: "/learn/my" },
      { label: "Courses Taken / Total Courses", n: taken, value: `${taken} / ${t.courses}`, color: C.pendSoft, href: "/learn/courses" },
      { label: "Certified", n: certified.length, color: C.ok, href: "/learn/certificates" },
      { label: "Instructors / LP Groups", n: t.instructors, value: `${t.instructors} / ${t.groups}`, color: C.okSoft, href: "/learn/paths" },
    ],
  };
}

export async function getStartedDonuts(viewer: { userId: string }, personId: string, side: "buyer" | "provider", jobsIn: Donut | undefined | Promise<Donut | undefined>, checklistIn: ChecklistItem[] | Promise<ChecklistItem[]>): Promise<Donut[]> {
  if (side === "provider") {
    const [connect, learn, jobs, checklist] = await Promise.all([connectDonut(viewer.userId, personId), learnDonut(personId, side), jobsIn, checklistIn]);
    return [profileDonut(checklist), connect, learn, ...(jobs ? [jobs] : [])];
  }
  // RM-E003: buyers see Account · Connect · Jobs · Shop (Learn stays reachable from Connect).
  const [jobs, checklist, providers, connect, shop] = await Promise.all([jobsIn, checklistIn, prisma.providerProfile.count(), connectDonut(viewer.userId, personId), shopDonut(viewer.userId, personId)]);
  const j = jobs && { ...jobs, lead: { text: `${providers.toLocaleString("en-US")} providers on Panameer`, href: "/connect/community", label: "Find People" } };
  return [accountDonut(checklist), connect, ...(j ? [j] : []), shop];
}

/** RM-E003: the buyer's Shop tile — Viewed · In Cart · Requested to Buy · Delivered, plus how many products are offered. */
export async function shopDonut(userId: string, personId: string): Promise<Donut> {
  const [viewed, cart, requested, delivered, offered] = await Promise.all([
    prisma.usageEvent.count({ where: { user_id: userId, app: "SHOP" } }),
    prisma.workRequestLine.count({ where: { workRequest: { buyer_person_id: personId, source: "SHOP", status: "INCOMPLETE" } } }),
    prisma.workRequest.count({ where: { buyer_person_id: personId, source: "SHOP", status: { notIn: ["INCOMPLETE", "CANCELLED", "WITHDRAWN"] } } }),
    prisma.workOrder.count({ where: { buyer_person_id: personId, workRequest: { source: "SHOP" }, status: { in: ["CLOSED", "FINALLY_CLOSED"] } } }),
    prisma.serviceProduct.count({ where: { status: "PUBLISHED" } }),
  ]);
  return {
    key: "shop", title: "Shop", sub: "Service products", href: "/shop", total: `${offered.toLocaleString("en-US")} products offered`,
    slices: [
      { label: "Viewed", n: viewed, color: C.steel, href: "/shop?tab=browse" },
      { label: "In Cart", n: cart, color: C.pend, mine: true, href: "/shop?tab=cart" },
      { label: "Requested to Buy", n: requested, color: C.ink, href: "/shop?tab=purchases" },
      { label: "Delivered", n: delivered, color: C.ok, href: "/shop?tab=purchases" },
    ],
  };
}
