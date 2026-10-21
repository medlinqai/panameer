import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// WS-E007: Work list filters from fields every work request has; values live in the URL.
export type WorkFilters = { skill?: string; rate?: string; location?: string; site?: string; length?: string; start?: string; type?: string; bt?: string };

const DAY = 86_400_000;
const RATE: Record<string, { label: string; where: Prisma.JobWhereInput }> = {
  u75: { label: "Under $75/hr", where: { budget_type: "HOURLY", OR: [{ budget_max_cents: { lt: 7500 } }, { budget_amount_cents: { lt: 7500 } }] } },
  "75to125": { label: "$75–$125/hr", where: { budget_type: "HOURLY", OR: [{ budget_max_cents: { gte: 7500, lte: 12500 } }, { budget_amount_cents: { gte: 7500, lte: 12500 } }] } },
  o125: { label: "Over $125/hr", where: { budget_type: "HOURLY", OR: [{ budget_max_cents: { gt: 12500 } }, { budget_amount_cents: { gt: 12500 } }] } },
  fixed: { label: "Fixed price", where: { budget_type: "FIXED" } },
};
const SITE: Record<string, string> = { OFFSITE: "Offsite", ONSITE: "Onsite", HYBRID: "Hybrid" };
/** Old ?site=remote / REMOTE links still work. */
export const siteKey = (v?: string) => { const k = v?.toUpperCase() === "REMOTE" ? "OFFSITE" : v?.toUpperCase(); return k && SITE[k] ? k : null; };
const LENGTH: Record<string, string> = { LT_1_MONTH: "Under 1 month", ONE_TO_3_MONTHS: "1–3 months", THREE_TO_6_MONTHS: "3–6 months", GT_6_MONTHS: "Over 6 months" };
const START: Record<string, { label: string; days: [number, number] }> = { "2w": { label: "Within 2 weeks", days: [-3650, 14] }, "30d": { label: "Within 30 days", days: [-3650, 30] }, later: { label: "Later", days: [30, 3650] } };

export function workFilterWhere(f: WorkFilters): Prisma.JobWhereInput[] {
  const and: Prisma.JobWhereInput[] = [];
  if (f.skill) and.push({ skills: { some: { skill_id: f.skill } } });
  if (f.rate && RATE[f.rate]) and.push(RATE[f.rate].where);
  if (f.location) and.push({ location_country: f.location });
  const site = siteKey(f.site);
  if (site) and.push({ worksite: site as "OFFSITE" | "ONSITE" | "HYBRID" });
  if (f.length && LENGTH[f.length]) and.push({ duration: f.length as "LT_1_MONTH" });
  if (f.start && START[f.start]) {
    const [a, b] = START[f.start].days;
    and.push({ start_date: { gte: new Date(Date.now() + a * DAY), lte: new Date(Date.now() + b * DAY) } });
  }
  if (f.type) and.push({ role_id: f.type });
  // TX-E006: Business Type — the request asks for skills of that business type.
  if (f.bt) and.push({ skills: { some: { skill: { business_type_id: f.bt } } } });
  return and;
}

/** The filter menus, built from posted requests. Skills shows only when the chosen role's requests use skills. */
export async function workFilterDefs(f: WorkFilters) {
  const posted: Prisma.JobWhereInput = { status: "OPEN", kind: "JOB", ...(f.type ? { role_id: f.type } : {}) };
  const [skills, countries, types, businessTypes] = await Promise.all([
    prisma.jobPostingSkill.findMany({ where: { job: posted }, distinct: ["skill_id"], select: { skill: { select: { id: true, name: true } } }, take: 200 }),
    prisma.job.findMany({ where: { status: "OPEN", kind: "JOB", location_country: { not: null } }, distinct: ["location_country"], select: { location_country: true } }),
    prisma.job.findMany({ where: { status: "OPEN", kind: "JOB", role_id: { not: null } }, distinct: ["role_id"], select: { role: { select: { id: true, display: true, name: true } } } }),
    prisma.businessType.findMany({ where: { hidden: false, uses_skills: true, commodity_group_id: { not: null } }, orderBy: { sort_order: "asc" }, select: { id: true, name: true } }),
  ]);
  const opts = (r: Record<string, string>) => Object.entries(r).map(([value, label]) => ({ value, label }));
  return [
    ...(skills.length ? [{ key: "skill", label: "Skills", options: skills.map((s) => ({ value: s.skill.id, label: s.skill.name })).sort((a, b) => a.label.localeCompare(b.label)) }] : []),
    { key: "rate", label: "Rate", options: Object.entries(RATE).map(([value, r]) => ({ value, label: r.label })) },
    { key: "location", label: "Location", options: countries.map((c) => ({ value: c.location_country!, label: c.location_country! })).sort((a, b) => a.label.localeCompare(b.label)) },
    { key: "site", label: "Onsite / Offsite", options: opts(SITE) },
    { key: "length", label: "Length", options: opts(LENGTH) },
    { key: "start", label: "Start", options: Object.entries(START).map(([value, r]) => ({ value, label: r.label })) },
    ...(businessTypes.length ? [{ key: "bt", label: "Business Type", options: businessTypes.map((b) => ({ value: b.id, label: b.name })) }] : []),
    { key: "type", label: "Role", options: types.flatMap((t) => (t.role ? [{ value: t.role.id, label: t.role.display || t.role.name }] : [])) },
  ];
}
