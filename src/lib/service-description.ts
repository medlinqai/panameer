import type { BudgetType, ContractType, WorkRequestDuration, WorksiteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OFFERABLE } from "@/lib/catalog";
import { matchSkills } from "@/lib/resume/match";
import type { AiServiceDescription } from "@/lib/work-request/job-import";

// SD-E002: the Service Description standard (the posting a buyer creates in Hire, stored as a Job), and the map from
// a parsed posting into it — role, product, skills matched like the résumé import; unmatched skills kept as custom.
export type SdContract = "C2C" | "W2" | "C2H" | "1099";
export type ServiceDescription = {
  category: string; title: string; summary: string;
  worksite: WorksiteType | null; city: string; state: string; country: string; onsiteDays: number | null;
  contractTypes: SdContract[];
  roleId: string | null; domains: string[]; product: string; skills: { id: string; name: string }[]; customSkills: string[];
  years: number | null; education: string; credentials: string[]; specialties: string[];
  responsibilities: string; required: string; niceToHave: string;
  startText: string; startDate: string; duration: WorkRequestDuration | null;
  budgetType: BudgetType | null; budgetMin: number | null; budgetMax: number | null;
  sourceText: string;
  /** Which fields the posting filled — for the "from your posting" hints. */
  fromPosting: string[];
};

export const emptySd = (): ServiceDescription => ({
  category: "", title: "", summary: "", worksite: null, city: "", state: "", country: "", onsiteDays: null, contractTypes: [],
  roleId: null, domains: [], product: "", skills: [], customSkills: [], years: null, education: "", credentials: [], specialties: [],
  responsibilities: "", required: "", niceToHave: "", startText: "", startDate: "", duration: null, budgetType: null, budgetMin: null, budgetMax: null,
  sourceText: "", fromPosting: [],
});

export const CONTRACT_TO_DB: Record<SdContract, ContractType> = { C2C: "C2C", W2: "W2", C2H: "C2H", "1099": "ONE_099" };
export const CONTRACT_FROM_DB: Record<ContractType, SdContract> = { C2C: "C2C", W2: "W2", C2H: "C2H", ONE_099: "1099" };

const ROLE_CODE: Record<string, string> = {
  Functional: "APPLICATION_SPECIFIC", "Techno-Functional": "APPLICATION_SPECIFIC", Technical: "TECHNOLOGY_SPECIFIC",
  "Project Manager": "PROJECT_DELIVERY_LEAD", "Solution Architect": "SOLUTION_ARCHITECT", Tester: "TESTER_SUPPORT",
  "Change & Training": "CHANGE_ENABLEMENT_LEAD", "AI Specialist": "AI_SPECIALIST",
};
/** The product line → its pillar in the skill catalog. */
export function productPillarName(product: string | null | undefined): string | null {
  const p = (product ?? "").toLowerCase();
  if (/peoplesoft/.test(p)) return "PeopleSoft";
  if (/\bebs\b|e-business/.test(p)) return "Oracle E-Business Suite";
  if (/workday/.test(p)) return "Workday";
  if (/salesforce/.test(p)) return "Salesforce";
  if (/fusion|oracle cloud|cloud erp|epm|oracle/.test(p)) return "Oracle Fusion Cloud";
  return null;
}
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
/** Posting words → the catalog's names (Oracle modules spelled the way the skill catalog spells them). */
const ALIASES: Record<string, string> = {
  "accounts payable": "Payables", ap: "Payables", "accounts receivable": "Receivables", ar: "Receivables", gl: "General Ledger",
  purchasing: "Purchase Orders", collections: "Advanced Collections", "supplier portal": "Supplier Management", "supplier qualification": "Supplier Qualification Management",
  "self service procurement": "Self-Service Procurement", ssp: "Self-Service Procurement", oic: "Oracle Integration Cloud", "oracle integration cloud oic": "Oracle Integration Cloud",
  vbcs: "Visual Builder Studio", "vb studio": "Visual Builder Studio", bip: "BI Publisher", "product information management": "Product Lifecycle Management", pim: "Product Lifecycle Management",
  fccs: "Financial Consolidation and Close", epbcs: "Planning", pbcs: "Planning", "epbcs planning": "Planning", eprcs: "Narrative Reporting", "narrative reporting eprcs": "Narrative Reporting",
  "hyperion financial reporting": "Financial Reporting Studio", "role based security": "RBAC Role Model", "approval workflows": "Approvals Management Extensions", fbdi: "FBDI", hdl: "HDL",
};
const aliasOf = (term: string) => ALIASES[norm(term)] ?? term;
const ERPISH = /oracle|fusion|\bebs\b|peoplesoft|workday|\bsap\b|netsuite|\berp\b|\bepm\b|hyperion/i;

export async function fromParsed(ai: AiServiceDescription, sourceText: string): Promise<ServiceDescription> {
  const role = ai.roleKind && ROLE_CODE[ai.roleKind] ? await prisma.role.findUnique({ where: { code: ROLE_CODE[ai.roleKind] }, select: { id: true } }) : null;
  const pillarName = productPillarName(ai.product ?? ai.title);
  const pillar = pillarName ? await prisma.pillar.findFirst({ where: { name: pillarName }, select: { id: true } }) : null;
  const catalog = await prisma.skill.findMany({
    where: { is_custom: false, ...OFFERABLE, ...(pillar ? { OR: [{ pillar_id: pillar.id }, { pillar_id: null }] } : {}) },
    select: { id: true, name: true, role_id: true },
  });
  const first = matchSkills(ai.skills.map(aliasOf), catalog);
  // Second pass for posting words the catalog spells longer ("Inventory" → "Inventory Management").
  const byName = new Map(catalog.map((c) => [norm(c.name), c]));
  const extra: { id: string; name: string }[] = [];
  const unmatched: string[] = [];
  for (const term of first.unmatched) {
    const t = norm(term);
    const hit = t.length >= 5 ? [...byName.entries()].filter(([n]) => n.split(" ").length <= 4 && (n.startsWith(`${t} `) || n.endsWith(` ${t}`) || n === t)).sort((x, y) => x[0].length - y[0].length)[0]?.[1] : undefined;
    if (hit) extra.push({ id: hit.id, name: hit.name });
    else unmatched.push(term);
  }
  const skills = [...new Map([...first.matched, ...extra].map((m) => [m.name.toLowerCase(), { id: m.id, name: m.name }])).values()];
  const filled = (k: string, v: unknown) => (v != null && v !== "" && !(Array.isArray(v) && !v.length) ? [k] : []);
  const sd: ServiceDescription = {
    ...emptySd(),
    category: ERPISH.test(`${ai.product ?? ""} ${ai.title ?? ""} ${ai.skills.join(" ")}`) ? "ERP & Oracle" : "",
    title: ai.title ?? "", summary: ai.summary ?? "",
    worksite: ai.worksite, city: ai.city ?? "", state: ai.state ?? "", country: ai.country ?? "", onsiteDays: ai.onsiteDaysPerWeek,
    contractTypes: ai.contractTypes,
    roleId: role?.id ?? null, domains: ai.domains, product: ai.product ?? "", skills, customSkills: unmatched.slice(0, 20),
    years: ai.yearsExperience, education: ai.education ?? "", credentials: ai.credentials, specialties: ai.specialties,
    responsibilities: ai.responsibilities.join("\n"), required: ai.mustHave.join("\n"), niceToHave: ai.niceToHave.join("\n"),
    startText: ai.startText ?? "", startDate: ai.startDate ?? "", duration: ai.duration,
    budgetType: ai.budgetType, budgetMin: ai.budgetMin, budgetMax: ai.budgetMax,
    sourceText,
  };
  sd.fromPosting = [
    ...filled("category", sd.category), ...filled("title", sd.title), ...filled("summary", sd.summary),
    ...filled("worksite", sd.worksite), ...filled("city", sd.city), ...filled("onsiteDays", sd.onsiteDays),
    ...filled("contractTypes", sd.contractTypes),
    ...filled("roleId", sd.roleId), ...filled("domains", sd.domains), ...filled("product", sd.product), ...filled("skills", sd.skills),
    ...filled("years", sd.years), ...filled("education", sd.education), ...filled("credentials", sd.credentials),
    ...filled("responsibilities", sd.responsibilities), ...filled("required", sd.required), ...filled("niceToHave", sd.niceToHave),
    ...filled("startText", sd.startText), ...filled("duration", sd.duration), ...filled("budget", sd.budgetMin ?? sd.budgetMax),
  ];
  return sd;
}

// ── SD-E003: save the standard onto the draft Job, and read it back for editing ────────────────────────────────
export async function writeServiceDescription(jobId: string, sd: ServiceDescription) {
  const [group, pillar] = await Promise.all([
    sd.category ? prisma.commodityGroup.findFirst({ where: { name: sd.category }, select: { id: true } }) : null,
    productPillarName(sd.product) ? prisma.pillar.findFirst({ where: { name: productPillarName(sd.product)! }, select: { id: true } }) : null,
  ]);
  const lines = (t: string) => t.trim().slice(0, 6000) || null;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      title: sd.title.trim().slice(0, 140), description: sd.summary.trim().slice(0, 4000) || null,
      commodity_group_id: group?.id ?? null,
      worksite: sd.worksite, city: sd.city.trim() || null, state: sd.state.trim() || null, location_country: sd.country.trim() || null,
      onsite_days_per_week: sd.worksite && sd.worksite !== "OFFSITE" ? sd.onsiteDays : null,
      contract_types: [...new Set(sd.contractTypes)].map((c) => CONTRACT_TO_DB[c]),
      role_id: sd.roleId, pillar_id: pillar?.id ?? null, product: sd.product.trim() || null, domains: sd.domains.slice(0, 8),
      custom_skills: [...new Set(sd.customSkills.map((s) => s.trim()).filter(Boolean))].slice(0, 30),
      years_experience: sd.years, education: sd.education.trim() || null,
      responsibilities: lines(sd.responsibilities), required: lines(sd.required), nice_to_have: lines(sd.niceToHave),
      start_text: sd.startText.trim() || null, start_date: /^\d{4}-\d{2}-\d{2}$/.test(sd.startDate) ? new Date(sd.startDate) : null, duration: sd.duration,
      budget_type: sd.budgetType, budget_min_cents: sd.budgetMin != null ? Math.round(sd.budgetMin * 100) : null, budget_max_cents: sd.budgetMax != null ? Math.round(sd.budgetMax * 100) : null, budget_amount_cents: null,
      ...(sd.sourceText ? { source_text: sd.sourceText.slice(0, 20000) } : {}),
    },
  });
  // Skills (catalog), credentials (matched to a known name), specialties (industries) — replaced as a set.
  const known = sd.credentials.length ? await prisma.credential.findMany({ where: { name: { in: sd.credentials, mode: "insensitive" } }, distinct: ["name"], select: { id: true, name: true } }) : [];
  const industries = sd.specialties.length ? await prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE", name: { in: sd.specialties, mode: "insensitive" } }, select: { id: true } }) : [];
  await prisma.$transaction([
    prisma.jobPostingSkill.deleteMany({ where: { job_id: jobId } }),
    prisma.jobPostingSkill.createMany({ data: sd.skills.map((s) => ({ job_id: jobId, skill_id: s.id })), skipDuplicates: true }),
    prisma.jobCredential.deleteMany({ where: { job_id: jobId } }),
    prisma.jobCredential.createMany({ data: sd.credentials.map((name) => ({ job_id: jobId, name, credential_id: known.find((k) => k.name.toLowerCase() === name.toLowerCase())?.id ?? null })) }),
    prisma.jobSpecialization.deleteMany({ where: { job_id: jobId } }),
    prisma.jobSpecialization.createMany({ data: industries.map((i) => ({ job_id: jobId, specialization_id: i.id })), skipDuplicates: true }),
  ]);
}

export async function readServiceDescription(jobId: string): Promise<ServiceDescription | null> {
  const j = await prisma.job.findUnique({
    where: { id: jobId },
    include: { skills: { include: { skill: { select: { id: true, name: true } } } }, credentials: true, specializations: { include: { specialization: { select: { name: true } } } } },
  });
  if (!j) return null;
  const group = j.commodity_group_id ? await prisma.commodityGroup.findUnique({ where: { id: j.commodity_group_id }, select: { name: true } }) : null;
  return {
    ...emptySd(),
    category: group?.name ?? "", title: j.title, summary: j.description ?? "",
    worksite: j.worksite, city: j.city ?? "", state: j.state ?? "", country: j.location_country ?? "", onsiteDays: j.onsite_days_per_week,
    contractTypes: j.contract_types.map((c) => CONTRACT_FROM_DB[c]),
    roleId: j.role_id, domains: j.domains, product: j.product ?? "", skills: j.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })), customSkills: j.custom_skills,
    years: j.years_experience, education: j.education ?? "", credentials: j.credentials.map((c) => c.name), specialties: j.specializations.map((s) => s.specialization.name),
    responsibilities: j.responsibilities ?? "", required: j.required ?? "", niceToHave: j.nice_to_have ?? "",
    startText: j.start_text ?? "", startDate: j.start_date ? j.start_date.toISOString().slice(0, 10) : "", duration: j.duration,
    budgetType: j.budget_type, budgetMin: j.budget_min_cents != null ? j.budget_min_cents / 100 : null, budgetMax: j.budget_max_cents != null ? j.budget_max_cents / 100 : null,
    sourceText: "",
  };
}
