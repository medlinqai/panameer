import type { BudgetType, ContractType, WorkRequestDuration, WorksiteType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OFFERABLE } from "@/lib/catalog";
import { durationBucket } from "@/lib/job-dates";
import { matchSkills } from "@/lib/resume/match";
import { aiClassifyPosting, aiExtractServiceDescription, stripContacts, type AiServiceDescription, type HierarchyOption, type PostingClass } from "@/lib/work-request/job-import";

// SD-E002: the Service Description standard (the posting a buyer creates in Hire, stored as a Job), and the map from
// a parsed posting into it — role, product, skills matched like the résumé import; unmatched skills kept as custom.
export type SdContract = "C2C" | "W2" | "C2H" | "1099";
export type ServiceDescription = {
  category: string; businessTypeId: string | null; businessType: string;
  /** PC-E001: how sure pass 1 was about the Category › Business Type (null when the buyer picked it). */
  classConfidence: "high" | "medium" | "low" | null;
  /** PC-E002: WHO uses Role › Domain › Skill only when the Business Type uses skills. */
  usesSkills: boolean;
  title: string; summary: string;
  worksite: WorksiteType | null; city: string; state: string; country: string; onsiteDays: number | null;
  contractTypes: SdContract[];
  roleId: string | null;
  /** SM-E005/HF-E003: the specific role (a work role name, e.g. Functional Consultant), saved as jobs.specific_role_id; roleId is its top role. */
  specificRole: string;
  domains: string[]; product: string; skills: { id: string; name: string }[]; customSkills: string[];
  years: number | null; education: string; credentials: string[]; specialties: string[];
  responsibilities: string; required: string; niceToHave: string;
  startText: string; startDate: string; endDate: string; duration: WorkRequestDuration | null;
  budgetType: BudgetType | null; budgetMin: number | null; budgetMax: number | null;
  sourceText: string;
  /** Which fields the posting filled — for the "from your posting" hints. */
  fromPosting: string[];
};

export const emptySd = (): ServiceDescription => ({
  category: "", businessTypeId: null, businessType: "", classConfidence: null, usesSkills: true, title: "", summary: "", worksite: null, city: "", state: "", country: "", onsiteDays: null, contractTypes: [],
  roleId: null, specificRole: "", domains: [], product: "", skills: [], customSkills: [], years: null, education: "", credentials: [], specialties: [],
  responsibilities: "", required: "", niceToHave: "", startText: "", startDate: "", endDate: "", duration: null, budgetType: null, budgetMin: null, budgetMax: null,
  sourceText: "", fromPosting: [],
});

export const CONTRACT_TO_DB: Record<SdContract, ContractType> = { C2C: "C2C", W2: "W2", C2H: "C2H", "1099": "ONE_099" };
export const CONTRACT_FROM_DB: Record<ContractType, SdContract> = { C2C: "C2C", W2: "W2", C2H: "C2H", ONE_099: "1099" };

const ROLE_CODE: Record<string, string> = {
  Functional: "APPLICATION_SPECIFIC", "Techno-Functional": "APPLICATION_SPECIFIC", Technical: "TECHNOLOGY_SPECIFIC",
  "Project Manager": "PROJECT_DELIVERY_LEAD", "Solution Architect": "SOLUTION_ARCHITECT", Tester: "TESTER_SUPPORT",
  "Change & Training": "CHANGE_ENABLEMENT_LEAD", "AI Specialist": "AI_SPECIALIST",
};
// MQ-E003: the deepest role level (the work roles under each top role), read from a title.
const DEEP_ROLES: [RegExp, string[]][] = [
  [/techno.?functional/i, ["Functional Consultant", "Technical Consultant / Developer"]],
  [/program (manager|director)|programme/i, ["Program Management"]],
  [/project manager|\bpmp\b|delivery lead/i, ["Project Manager"]],
  [/architect/i, ["Solution Architect", "Technical Architect"]],
  [/test (lead|manager)|\bqa\b|testing|tester/i, ["Test Lead", "Testing Specialist"]],
  [/training|change (management|lead)|\bocm\b|enablement/i, ["Training Lead", "Organizational Change Mgt"]],
  [/functional/i, ["Functional Consultant"]],
  [/technical|developer|integration|\boic\b/i, ["Technical Consultant / Developer"]],
  [/support analyst|application support|\bams\b/i, ["Application Support Analyst"]],
];
export function deepRolesIn(text: string): string[] {
  for (const [re, names] of DEEP_ROLES) if (re.test(text)) return names;
  return [];
}

/** SM-E005: the parser's role kind → the specific role. */
const KIND_TO_SPECIFIC: Record<string, string> = {
  Functional: "Functional Consultant", "Techno-Functional": "Functional Consultant", Technical: "Technical Consultant / Developer",
  "Project Manager": "Project Manager", "Solution Architect": "Solution Architect", Tester: "Test Lead", "Change & Training": "Training Lead",
};
/** SM-E005: a specific role's top role code (Functional Consultant → Application-Specific …). */
export function topRoleCodeFor(specific: string): string | null {
  const n = specific.toLowerCase();
  if (/functional|business (process|architect)/.test(n)) return "APPLICATION_SPECIFIC";
  if (/architect/.test(n)) return "SOLUTION_ARCHITECT";
  if (/technical|developer|integration/.test(n)) return "TECHNOLOGY_SPECIFIC";
  if (/project|program|pmo|cutover|delivery/.test(n)) return "PROJECT_DELIVERY_LEAD";
  if (/test/.test(n)) return "TESTER_SUPPORT";
  if (/training|change|enablement|adoption/.test(n)) return "CHANGE_ENABLEMENT_LEAD";
  if (/\bai\b/.test(n)) return "AI_SPECIALIST";
  return null;
}
/** SM-E005: the specific roles a job can ask for (the RDS work roles, one per name). */
export async function workRoleNames(): Promise<string[]> {
  const rows = await prisma.workRole.findMany({ where: { hidden: false }, orderBy: [{ mode: "asc" }, { sort_order: "asc" }, { name: "asc" }], select: { name: true } });
  return [...new Set(rows.map((r) => r.name))];
}
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
  inventory: "Inventory Management",
  vbcs: "Visual Builder Studio", "vb studio": "Visual Builder Studio", bip: "BI Publisher", "product information management": "Product Lifecycle Management", pim: "Product Lifecycle Management",
  fccs: "Financial Consolidation and Close", epbcs: "Planning", pbcs: "Planning", "epbcs planning": "Planning", eprcs: "Narrative Reporting", "narrative reporting eprcs": "Narrative Reporting",
  xbrl: "XBRL Tagging", ixbrl: "XBRL Tagging", doclets: "Doclets / Report Packages", "report packages": "Doclets / Report Packages", "oracle essbase": "Essbase",
  "hyperion financial reporting": "Financial Reporting Studio", "role based security": "RBAC Role Model", "approval workflows": "Approvals Management Extensions", fbdi: "FBDI", hdl: "HDL",
};
/** SM-E002: generic words on their own never match a skill. */
const GENERIC = new Set(["accounting", "onboarding", "management", "processing", "order", "orders", "finance", "procurement", "reporting", "operations", "support"]);
const aliasOf = (term: string) => ALIASES[norm(term)] ?? term;
const ERPISH = /oracle|fusion|\bebs\b|peoplesoft|workday|\bsap\b|netsuite|\berp\b|\bepm\b|hyperion/i;

export async function fromParsed(ai: AiServiceDescription, sourceText: string, pick?: { category: string; businessTypeId: string; businessType: string; usesSkills: boolean; confidence: PostingClass["confidence"] } | null): Promise<ServiceDescription> {
  const specificRole = ai.workRole?.trim() || (ai.roleKind ? KIND_TO_SPECIFIC[ai.roleKind] ?? "" : "");
  const code = (specificRole && topRoleCodeFor(specificRole)) || (ai.roleKind ? ROLE_CODE[ai.roleKind] : null);
  const role = code ? await prisma.role.findUnique({ where: { code }, select: { id: true } }) : null;
  const pillarName = productPillarName(ai.product ?? ai.title);
  const pillar = pillarName ? await prisma.pillar.findFirst({ where: { name: pillarName }, select: { id: true } }) : null;
  const catalog = await prisma.skill.findMany({
    where: { is_custom: false, ...OFFERABLE, ...(pillar ? { OR: [{ pillar_id: pillar.id }, { pillar_id: null }, { role: { code: "OPERATIONS_SPECIFIC" } }] } : {}) },
    select: { id: true, name: true, role_id: true },
  });
  // SM-E002: exact (or alias) names only — the extraction already picked from the catalog; no prefix/suffix guessing.
  // The model sometimes files a catalog name under "other" or misspells it ("Invoices …") — those still match, by spelling only.
  const singular = (x: string) => norm(x).split(" ").map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)).join(" ");
  const bySpelling = new Map(catalog.map((c) => [singular(c.name), c]));
  const terms = [...ai.skills, ...ai.otherSkills].map(aliasOf);
  const first = matchSkills(terms, catalog);
  const spelled = first.unmatched.map((t) => bySpelling.get(singular(t))).filter((c): c is (typeof catalog)[number] => !!c);
  const unmatched = first.unmatched.filter((t) => !bySpelling.has(singular(t)) && t.split(/\s+/).length <= 4 && !GENERIC.has(norm(t)));
  const skills = [...new Map([...first.matched, ...spelled].map((m) => [m.name.toLowerCase(), { id: m.id, name: m.name }])).values()];
  const filled = (k: string, v: unknown) => (v != null && v !== "" && !(Array.isArray(v) && !v.length) ? [k] : []);
  const sd: ServiceDescription = {
    ...emptySd(),
    category: pick?.category ?? (pick === undefined && ERPISH.test(`${ai.product ?? ""} ${ai.title ?? ""} ${ai.skills.join(" ")}`) ? "ERP & Oracle" : ""),
    businessTypeId: pick?.businessTypeId ?? null, businessType: pick?.businessType ?? "", classConfidence: pick?.confidence ?? (pick === null ? "low" : null), usesSkills: pick?.usesSkills ?? true,
    title: ai.title ?? "", summary: ai.summary ?? "",
    worksite: ai.worksite, city: ai.city ?? "", state: ai.state ?? "", country: ai.country ?? "", onsiteDays: ai.onsiteDaysPerWeek,
    contractTypes: ai.contractTypes,
    roleId: role?.id ?? null, specificRole, domains: ai.domains, product: ai.product ?? "", skills, customSkills: [...new Set(unmatched)].slice(0, 12),
    years: ai.yearsExperience, education: ai.education ?? "", credentials: ai.credentials, specialties: ai.specialties,
    responsibilities: ai.responsibilities.join("\n"), required: ai.mustHave.join("\n"), niceToHave: ai.niceToHave.join("\n"),
    startText: ai.startText ?? "", startDate: ai.startDate ?? "", endDate: ai.endDate ?? "", duration: ai.duration,
    budgetType: ai.budgetType, budgetMin: ai.budgetMin, budgetMax: ai.budgetMax,
    sourceText,
  };
  sd.fromPosting = [
    ...filled("category", sd.category), ...filled("businessType", sd.businessTypeId), ...filled("title", sd.title), ...filled("summary", sd.summary),
    ...filled("worksite", sd.worksite), ...filled("city", sd.city), ...filled("onsiteDays", sd.onsiteDays),
    ...filled("contractTypes", sd.contractTypes),
    ...filled("roleId", sd.roleId || sd.specificRole), ...filled("domains", sd.domains), ...filled("product", sd.product), ...filled("skills", sd.skills),
    ...filled("years", sd.years), ...filled("education", sd.education), ...filled("credentials", sd.credentials),
    ...filled("responsibilities", sd.responsibilities), ...filled("required", sd.required), ...filled("niceToHave", sd.niceToHave),
    ...filled("startDate", sd.startDate), ...filled("endDate", sd.endDate), ...filled("startText", sd.startText), ...filled("duration", sd.duration), ...filled("budget", sd.budgetMin ?? sd.budgetMax),
  ];
  return sd;
}

// ── SD-E003: save the standard onto the draft Job, and read it back for editing ────────────────────────────────
export async function writeServiceDescription(jobId: string, sd: ServiceDescription) {
  const [group, pillar, specific] = await Promise.all([
    sd.category ? prisma.commodityGroup.findFirst({ where: { name: sd.category }, select: { id: true } }) : null,
    productPillarName(sd.product) ? prisma.pillar.findFirst({ where: { name: productPillarName(sd.product)! }, select: { id: true } }) : null,
    sd.specificRole ? prisma.workRole.findFirst({ where: { name: sd.specificRole, hidden: false }, orderBy: [{ mode: "asc" }, { sort_order: "asc" }], select: { id: true } }) : null,
  ]);
  const lines = (t: string) => t.trim().slice(0, 6000) || null;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      title: sd.title.trim().slice(0, 140), description: sd.summary.trim().slice(0, 4000) || null,
      commodity_group_id: group?.id ?? null, business_type_id: sd.businessTypeId,
      worksite: sd.worksite, city: sd.city.trim() || null, state: sd.state.trim() || null, location_country: sd.country.trim() || null,
      onsite_days_per_week: sd.worksite && sd.worksite !== "OFFSITE" ? sd.onsiteDays : null,
      contract_types: [...new Set(sd.contractTypes)].map((c) => CONTRACT_TO_DB[c]),
      role_id: sd.roleId, specific_role_id: specific?.id ?? null, pillar_id: pillar?.id ?? null, product: sd.product.trim() || null, domains: sd.domains.slice(0, 8),
      custom_skills: [...new Set(sd.customSkills.map((s) => s.trim()).filter(Boolean))].slice(0, 30),
      years_experience: sd.years, education: sd.education.trim() || null,
      responsibilities: lines(sd.responsibilities), required: lines(sd.required), nice_to_have: lines(sd.niceToHave),
      start_text: sd.startText.trim() || null, start_date: /^\d{4}-\d{2}-\d{2}$/.test(sd.startDate) ? new Date(sd.startDate) : null, end_date: /^\d{4}-\d{2}-\d{2}$/.test(sd.endDate) ? new Date(sd.endDate) : null, duration: sd.endDate && sd.startDate ? durationBucket(sd.startDate, sd.endDate) : sd.duration,
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
    include: { specificRole: { select: { name: true } }, skills: { include: { skill: { select: { id: true, name: true } } } }, credentials: true, specializations: { include: { specialization: { select: { name: true } } } } },
  });
  if (!j) return null;
  const [group, bt] = await Promise.all([
    j.commodity_group_id ? prisma.commodityGroup.findUnique({ where: { id: j.commodity_group_id }, select: { name: true } }) : null,
    j.business_type_id ? prisma.businessType.findUnique({ where: { id: j.business_type_id }, select: { name: true, uses_skills: true } }) : null,
  ]);
  return {
    ...emptySd(),
    category: group?.name ?? "", businessTypeId: j.business_type_id, businessType: bt?.name ?? "", usesSkills: bt?.uses_skills ?? true, title: j.title, summary: j.description ?? "",
    worksite: j.worksite, city: j.city ?? "", state: j.state ?? "", country: j.location_country ?? "", onsiteDays: j.onsite_days_per_week,
    contractTypes: j.contract_types.map((c) => CONTRACT_FROM_DB[c]),
    roleId: j.role_id, specificRole: j.specificRole?.name ?? deepRolesIn(`${j.title} ${j.description ?? ""}`)[0] ?? "", domains: j.domains, product: j.product ?? "", skills: j.skills.map((s) => ({ id: s.skill.id, name: s.skill.name })), customSkills: j.custom_skills,
    years: j.years_experience, education: j.education ?? "", credentials: j.credentials.map((c) => c.name), specialties: j.specializations.map((s) => s.specialization.name),
    responsibilities: j.responsibilities ?? "", required: j.required ?? "", niceToHave: j.nice_to_have ?? "",
    startText: j.start_text ?? "", startDate: j.start_date ? j.start_date.toISOString().slice(0, 10) : "", endDate: j.end_date ? j.end_date.toISOString().slice(0, 10) : "", duration: j.duration,
    budgetType: j.budget_type, budgetMin: j.budget_min_cents != null ? j.budget_min_cents / 100 : null, budgetMax: j.budget_max_cents != null ? j.budget_max_cents / 100 : null,
    sourceText: "",
  };
}

// ── PC-E001/E002: classify first, then extract with that Business Type; a changed pick re-runs pass 2 only ─────────
export async function postingHierarchy() {
  const groups = await prisma.commodityGroup.findMany({
    where: { hidden: false, show_in_shop: true }, orderBy: { sort_order: "asc" },
    select: { name: true, businessTypes: { where: { hidden: false }, orderBy: { sort_order: "asc" }, select: { id: true, name: true, uses_skills: true, description: true } } },
  });
  const options: HierarchyOption[] = groups.map((g) => ({ category: g.name, businessTypes: g.businessTypes.map((b) => ({ name: b.name, usesSkills: b.uses_skills, description: b.description })) }));
  return { groups, options };
}

async function btContext(businessTypeId: string) {
  const bt = await prisma.businessType.findUnique({
    where: { id: businessTypeId },
    select: { id: true, name: true, uses_skills: true, commodityGroup: { select: { name: true } }, serviceCategories: { select: { serviceTypes: { where: { hidden: false, merged_into_id: null }, select: { name: true } } } } },
  });
  if (!bt?.commodityGroup) return null;
  return { id: bt.id, category: bt.commodityGroup.name, name: bt.name, usesSkills: bt.uses_skills, types: bt.serviceCategories.flatMap((c) => c.serviceTypes.map((t) => t.name)) };
}

export type ParseResult = { ok: true; sd: ServiceDescription } | { ok: false; reason: string };

export async function parsePosting(text: string): Promise<ParseResult> {
  const { groups, options } = await postingHierarchy();
  const cls = await aiClassifyPosting(text, options);
  const hit = cls && cls.confidence !== "low" && cls.businessType ? groups.find((g) => g.name === cls.category)?.businessTypes.find((b) => b.name === cls.businessType) : undefined;
  const ctx = hit ? await btContext(hit.id) : null;
  const catalog = ctx ? { skills: await skillCatalogFor(ctx.id, text), workRoles: ctx.usesSkills ? await workRoleNames() : [] } : null;
  // One retry: the model occasionally returns a shape we can't read.
  let out = await aiExtractServiceDescription(text, ctx, catalog);
  if (!out.ok && out.reason === "error") out = await aiExtractServiceDescription(text, ctx, catalog);
  if (!out.ok) { console.error(`[parsePosting] ${out.reason}: ${out.message}`); return { ok: false, reason: out.reason }; }
  const pick = ctx && cls ? { category: ctx.category, businessTypeId: ctx.id, businessType: ctx.name, usesSkills: ctx.usesSkills, confidence: cls.confidence } : null;
  return { ok: true, sd: await fromParsed(out.data, stripContacts(text), pick) };
}

const WHO_KEYS = ["roleId", "specificRole", "domains", "product", "skills", "customSkills", "years", "education", "credentials", "specialties", "responsibilities", "required", "niceToHave"] as const;
/** PC-E002: the buyer changed the Business Type — pass 2 again for WHO only; What/Where/Contract/When/Rate stay as they are. */
export async function reparseWho(sourceText: string, businessTypeId: string): Promise<Partial<ServiceDescription> | null> {
  const ctx = await btContext(businessTypeId);
  if (!ctx || sourceText.trim().length < 60) return null;
  const out = await aiExtractServiceDescription(sourceText, ctx, { skills: await skillCatalogFor(ctx.id, sourceText), workRoles: ctx.usesSkills ? await workRoleNames() : [] });
  if (!out.ok) return null;
  const sd = await fromParsed(out.data, sourceText, { category: ctx.category, businessTypeId: ctx.id, businessType: ctx.name, usesSkills: ctx.usesSkills, confidence: "high" });
  const who: Partial<ServiceDescription> = { category: ctx.category, businessTypeId: ctx.id, businessType: ctx.name, usesSkills: ctx.usesSkills, classConfidence: null };
  for (const k of WHO_KEYS) (who as Record<string, unknown>)[k] = sd[k];
  if (!ctx.usesSkills) Object.assign(who, { roleId: null, specificRole: "", domains: [], product: "" });
  return { ...who, fromPosting: sd.fromPosting.filter((k) => (WHO_KEYS as readonly string[]).includes(k)) };
}

/** SM-E001: the skill names pass 2 may pick from — the Business Type's catalog under the posting's product pillar (plus pillar-less skills). */
export async function skillCatalogFor(businessTypeId: string, text: string): Promise<string[]> {
  const bt = await prisma.businessType.findUnique({ where: { id: businessTypeId }, select: { uses_skills: true } });
  if (!bt?.uses_skills) return [];
  const pillarName = productPillarName(text) ?? "Oracle Fusion Cloud";
  const pillar = await prisma.pillar.findFirst({ where: { name: pillarName }, select: { id: true } });
  // The product's modules plus the RDS process-domain skills (Procure-to-Pay › Payments & Cash Management …).
  const rows = await prisma.skill.findMany({ where: { business_type_id: businessTypeId, is_custom: false, ...OFFERABLE, OR: [{ pillar_id: pillar?.id ?? undefined }, { pillar_id: null }, { role: { code: "OPERATIONS_SPECIFIC" } }] }, select: { name: true } });
  return [...new Set(rows.map((r) => r.name))].sort();
}
