import type { WorkRequestDuration, WorksiteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { marketplaceWhere } from "@/lib/visibility";
import { isTalentCategory } from "@/lib/shop-categories";
import { createDraft } from "@/lib/work-request";

// SH-E004: Hire Talent — masked supply from live talent sellers, and "Tell us what you need" → a Work Request with matches.
export const HOW_LONG: { value: WorkRequestDuration; label: string }[] = [
  { value: "LT_1_MONTH", label: "Under 1 month" },
  { value: "ONE_TO_3_MONTHS", label: "1–3 months" },
  { value: "THREE_TO_6_MONTHS", label: "3–6 months" },
  { value: "GT_6_MONTHS", label: "6+ months / ongoing" },
];
export const BUDGET = [
  { value: "u100", label: "Up to $100/hr", min: null, max: 10_000 },
  { value: "100to150", label: "$100–150/hr", min: 10_000, max: 15_000 },
  { value: "150to200", label: "$150–200/hr", min: 15_000, max: 20_000 },
  { value: "o200", label: "$200+/hr", min: 20_000, max: null },
  { value: "fixed", label: "Fixed price", min: null, max: null },
];
export const WHERE: { value: string; label: string; worksite: WorksiteType | null }[] = [
  { value: "offsite", label: "Offsite", worksite: "OFFSITE" },
  { value: "onsite", label: "Onsite", worksite: "ONSITE" },
  { value: "either", label: "Either", worksite: null },
];

/** The "Who" a buyer picks: the seller's title without credentials ("Oracle Cloud Project Manager (PMP)" → "Oracle Cloud Project Manager"). */
export const whoOf = (title: string | null | undefined) => (title ?? "").replace(/\s*\(.*?\)/g, "").trim();
/** The masked group: the area without Functional / Technical. */
const areaOf = (title: string) => whoOf(title).replace(/\b(Functional|Technical)\s+/gi, "").trim();

async function liveTalent(seesTest: boolean) {
  const rows = await prisma.providerProfile.findMany({
    where: await marketplaceWhere(seesTest),
    select: { id: true, person: { select: { title: true, company: { select: { businessTypes: { select: { businessType: { select: { commodityGroup: { select: { name: true } } } } } } } } } } },
  });
  return rows.filter((r) => (r.person.company?.businessTypes ?? []).some((b) => isTalentCategory(b.businessType.commodityGroup?.name)) && whoOf(r.person.title));
}

export type TalentGroup = { area: string; count: number; kinds: string; rate: string | null };

export async function talentSupply(seesTest: boolean): Promise<{ who: string[]; groups: TalentGroup[] }> {
  const talent = await liveTalent(seesTest);
  const rates = await prisma.providerService.findMany({ where: { provider_profile_id: { in: talent.map((t) => t.id) }, active: true, published_at: { not: null }, rate_cents: { not: null }, uom: "HOUR" }, select: { provider_profile_id: true, rate_cents: true } });
  const by = new Map<string, { ids: string[]; kinds: Set<string> }>();
  for (const t of talent) {
    const title = t.person.title!;
    const g = by.get(areaOf(title)) ?? { ids: [], kinds: new Set<string>() };
    g.ids.push(t.id);
    const k = /functional/i.test(title) ? "Functional" : /technical/i.test(title) ? "Technical" : null;
    if (k) g.kinds.add(k);
    by.set(areaOf(title), g);
  }
  const dollars = (c: number) => `$${Math.round(c / 100)}`;
  const groups = [...by.entries()]
    .map(([area, g]) => {
      const r = rates.filter((x) => g.ids.includes(x.provider_profile_id)).map((x) => x.rate_cents!).sort((a, b) => a - b);
      const kinds = g.kinds.size === 2 ? "Functional & technical" : [...g.kinds][0] ?? "Lead / specialist";
      return { area, count: g.ids.length, kinds, rate: r.length ? (r[0] === r[r.length - 1] ? `${dollars(r[0])}/hr` : `${dollars(r[0])}–${dollars(r[r.length - 1])}/hr`) : null };
    })
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area));
  const who = [...new Set(talent.map((t) => whoOf(t.person.title)))].sort();
  return { who, groups };
}

export class HireTalentError extends Error {}

/** "See my matches": a draft Job (the Work Request) carrying the role and skills of the live talent with that title. */
export async function tellUsWhatYouNeed(viewer: Viewer, seesTest: boolean, input: { who: string; other?: string; howLong: string; budget: string; where: string }): Promise<string> {
  const who = input.who === "other" ? (input.other ?? "").trim() : input.who.trim();
  if (!who) throw new HireTalentError("Tell us who you need.");
  const duration = HOW_LONG.find((h) => h.value === input.howLong)?.value ?? null;
  const budget = BUDGET.find((b) => b.value === input.budget);
  const where = WHERE.find((w) => w.value === input.where);
  const same = (await liveTalent(seesTest)).filter((t) => whoOf(t.person.title) === who).map((t) => t.id);
  const [skills, roles] = await Promise.all([
    prisma.providerSkill.findMany({ where: { provider_profile_id: { in: same } }, orderBy: { weight: "desc" }, select: { skill_id: true }, take: 40 }),
    prisma.providerProfileRole.findMany({ where: { provider_profile_id: { in: same } }, select: { role_id: true } }),
  ]);
  const roleCount = new Map<string, number>();
  for (const r of roles) roleCount.set(r.role_id, (roleCount.get(r.role_id) ?? 0) + 1);
  const roleId = [...roleCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const skillIds = [...new Set(skills.map((s) => s.skill_id))].slice(0, 8);

  const draft = await createDraft(viewer);
  await prisma.job.update({
    where: { id: draft.id },
    data: {
      title: `${who}${duration ? ` · ${HOW_LONG.find((h) => h.value === duration)!.label}` : ""}`,
      description: [`Who: ${who}`, duration && `How long: ${HOW_LONG.find((h) => h.value === duration)!.label}`, budget && `Budget: ${budget.label}`, where && `Where: ${where.label}`].filter(Boolean).join("\n"),
      role_id: roleId,
      duration,
      worksite: where?.worksite ?? null,
      ...(budget ? (budget.value === "fixed" ? { budget_type: "FIXED" as const } : { budget_type: "HOURLY" as const, budget_min_cents: budget.min, budget_max_cents: budget.max }) : {}),
    },
  });
  if (skillIds.length) await prisma.jobPostingSkill.createMany({ data: skillIds.map((skill_id) => ({ job_id: draft.id, skill_id })), skipDuplicates: true });
  return draft.id;
}
