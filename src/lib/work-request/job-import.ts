import { z } from "zod";
import { callExtractionModel } from "@/lib/resume/ai-provider";
import type { ModelUsage, ParserTier, ProviderName } from "@/lib/resume/ai-provider";

export const AI_JOB_SCHEMA = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  skills: z.array(z.string()),
  budgetType: z.enum(["HOURLY", "FIXED"]).nullable(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  currency: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  locationCountry: z.string().nullable(),
  worksite: z.enum(["OFFSITE", "ONSITE", "HYBRID"]).nullable(),
});
export type AiJob = z.infer<typeof AI_JOB_SCHEMA>;

const TOOL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "skills",
    "budgetType",
    "budgetMin",
    "budgetMax",
    "currency",
    "startDate",
    "endDate",
    "locationCountry",
    "worksite",
  ],
  properties: {
    title: { type: ["string", "null"], description: "The role or engagement title." },
    description: {
      type: ["string", "null"],
      description:
        "What the work is, in the poster's own words. Keep the substance; drop boilerplate about the company, benefits, and equal-opportunity statements.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Named skills, tools and systems the work requires. Terms only, as written. Empty array if none are named.",
    },
    budgetType: {
      type: ["string", "null"],
      enum: ["HOURLY", "FIXED", null],
      description: "HOURLY for a rate, FIXED for a total. Null if the posting does not say.",
    },
    budgetMin: {
      type: ["number", "null"],
      description:
        "Lower bound in whole currency units, not cents. A single stated figure goes in BOTH min and max. Null unless the posting states money.",
    },
    budgetMax: { type: ["number", "null"], description: "Upper bound in whole currency units." },
    currency: { type: ["string", "null"], description: "ISO code, e.g. USD. Null if unstated." },
    startDate: {
      type: ["string", "null"],
      description:
        "YYYY-MM-DD, only if the posting names a real date. Never compute one from 'ASAP' or 'immediately'.",
    },
    endDate: { type: ["string", "null"], description: "YYYY-MM-DD, same rule as startDate." },
    locationCountry: {
      type: ["string", "null"],
      description: "Country as written, or 'Worldwide' if the posting says anywhere.",
    },
    worksite: {
      type: ["string", "null"],
      enum: ["OFFSITE", "ONSITE", "HYBRID", null],
      description: "Null unless the posting is explicit.",
    },
  },
} as const;

const SYSTEM = `You convert a pasted job posting into a structured Service Requisition.

Return ONLY what the posting actually states.

Leave a field null when the posting does not state it. Do not infer, average,
estimate, or fill a gap with what is typical for the role. A null field costs
the user one keystroke; an invented one is a wrong Service Requisition they may post
without noticing.

Specific rules:
- Money: only from a stated figure or range. "Competitive", "DOE" and
  "negotiable" mean null. Convert "$60/hr" to budgetType HOURLY, min 60, max 60.
  A range "$60-80/hr" is min 60, max 80.
- Dates: only real dates. "ASAP", "immediately" and "Q3" are not dates.
- Skills: the terms the posting names. Do not expand an acronym into a list, do
  not add adjacent tools the poster did not mention.
- Description: keep what describes the work. Drop company marketing, benefits,
  application instructions and equal-opportunity boilerplate.`;

export type JobImportOutcome =
  | {
      ok: true;
      data: AiJob;
      model: string;
      provider: ProviderName;
      tier: ParserTier;
      ms: number;
      usage: ModelUsage;
    }
  | { ok: false; reason: "no_key" | "truncated" | "error" | "refusal" | "deadline"; message: string };

export const JOB_POSTING_TIMEOUT_MS = 22_000;

export async function aiExtractJobPosting(text: string): Promise<JobImportOutcome> {
  const call = await callExtractionModel({
    timeoutMs: JOB_POSTING_TIMEOUT_MS,
    system: SYSTEM,
    schema: TOOL_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "record_work_request",
    text,
    instruction: "Convert this job posting into a Service Requisition.",
    tag: "posting",
    toolDescription: "Record the structured contents of this job posting.",
    maxOutputTokens: 8_000,
  });

  if (!call.ok) return call;

  const parsed = AI_JOB_SCHEMA.safeParse(call.value);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "error",
      message: "The model returned a shape we could not read.",
    };
  }

  return {
    ok: true,
    data: sanitize(parsed.data),
    model: call.model,
    provider: call.provider,
    tier: call.tier,
    ms: call.ms,
    usage: call.usage,
  };
}

function sanitize(d: AiJob): AiJob {
  const money = (n: number | null) => (n !== null && n > 0 && Number.isFinite(n) ? n : null);
  const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

  let min = money(d.budgetMin);
  let max = money(d.budgetMax);
  // A reversed range is a misread, not a preference.
  if (min !== null && max !== null && max < min) [min, max] = [max, min];

  const start = date(d.startDate);
  let end = date(d.endDate);
  if (start && end && end < start) end = null;

  return {
    ...d,
    title: d.title?.trim() || null,
    description: d.description?.trim() || null,
    skills: [...new Set(d.skills.map((s) => s.trim()).filter(Boolean))].slice(0, 40),
    budgetMin: min,
    budgetMax: max,
    // A type with no figures behind it tells the wizard nothing.
    budgetType: min === null && max === null ? null : d.budgetType,
    startDate: start,
    endDate: end,
    locationCountry: d.locationCountry?.trim() || null,
  };
}

// ── SD-E002: the Service Description standard — WHAT · WHERE · TYPE · WHO · WHEN · RATE ────────────────────────
export const ROLE_KINDS = ["Functional", "Technical", "Techno-Functional", "Project Manager", "Solution Architect", "Tester", "Change & Training", "AI Specialist", "Other"] as const;

// A model sometimes sends null for an empty list.
const strList = z.preprocess((v) => v ?? [], z.array(z.string()));
export const AI_SD_SCHEMA = z.object({
  title: z.string().nullable(),
  summary: z.string().nullable(),
  worksite: z.enum(["OFFSITE", "ONSITE", "HYBRID"]).nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  onsiteDaysPerWeek: z.number().nullable(),
  contractTypes: z.preprocess((v) => v ?? [], z.array(z.enum(["C2C", "W2", "C2H", "1099"]))),
  roleKind: z.enum(ROLE_KINDS).nullable(),
  /** SM-E005: the specific RDS role (a work role name), when the catalog list is given. */
  workRole: z.string().nullable().optional(),
  domains: strList,
  product: z.string().nullable(),
  skills: strList,
  /** SM-E001: what the posting asks for that the catalog list doesn't have — short noun phrases (≤4 words). */
  otherSkills: strList,
  yearsExperience: z.number().nullable(),
  education: z.string().nullable(),
  credentials: strList,
  specialties: strList,
  responsibilities: strList,
  mustHave: strList,
  niceToHave: strList,
  startText: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable().default(null),
  duration: z.enum(["LT_1_MONTH", "ONE_TO_3_MONTHS", "THREE_TO_6_MONTHS", "GT_6_MONTHS"]).nullable(),
  budgetType: z.enum(["HOURLY", "FIXED"]).nullable(),
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
});
export type AiServiceDescription = z.infer<typeof AI_SD_SCHEMA>;

const str = (d: string) => ({ type: ["string", "null"], description: d });
const num = (d: string) => ({ type: ["number", "null"], description: d });
const list = (d: string) => ({ type: "array", items: { type: "string" }, description: d });
const SD_TOOL = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(AI_SD_SCHEMA.shape),
  properties: {
    title: str("The role or engagement title, without the client or recruiter name."),
    summary: str("Two sentences on what the work is. No company marketing, benefits or contact details."),
    worksite: { type: ["string", "null"], enum: ["OFFSITE", "ONSITE", "HYBRID", null], description: "Remote / work from home = OFFSITE. Null unless stated." },
    city: str("City of the worksite, if stated."),
    state: str("US state as its 2-letter code (GA), or the region as written."),
    country: str("Country, if stated."),
    onsiteDaysPerWeek: num("Days per week on site for hybrid/onsite work, if stated (e.g. 3)."),
    contractTypes: { type: "array", items: { type: "string", enum: ["C2C", "W2", "C2H", "1099"] }, description: "Engagement types the posting allows: C2C (corp-to-corp), W2, C2H (contract-to-hire), 1099. Empty if not stated." },
    roleKind: { type: ["string", "null"], enum: [...ROLE_KINDS, null], description: "The kind of role." },
    workRole: { type: ["string", "null"], description: "The specific role, e.g. Functional Consultant." },
    domains: list("Business process areas named or clearly implied by the modules: P2P, O2C, R2R, SCM, HCM, EPM, PPM, CX. Short codes."),
    product: str("The software product line: Fusion Cloud, EBS, PeopleSoft, EPM Cloud, Workday, Salesforce, … as written."),
    skills: list("Named modules, tools and skills, as written (e.g. Purchasing, Supplier Portal, OIC, BI Publisher). Terms only."),
    otherSkills: list("Skills the posting asks for that are NOT in the skills list — short noun phrases of at most 4 words (e.g. Finance Transformation, Oracle Agent Studio). Never a sentence."),
    yearsExperience: num("Minimum years of experience asked for, as a number."),
    education: str("Degree asked for, if any."),
    credentials: list("Certifications asked for (e.g. Oracle Cloud Procurement Certified)."),
    specialties: list("Industries named (Utilities, Healthcare, Public Sector…)."),
    responsibilities: list("What the person will do, one item per entry, short."),
    mustHave: list("Must-have requirements, one per entry."),
    niceToHave: list("Preferred / nice-to-have items, one per entry."),
    startText: str("When it starts in words: 'ASAP', 'Within 2 weeks', or a date as written."),
    startDate: str("YYYY-MM-DD only when a real date is stated."),
    endDate: str("End date, YYYY-MM-DD, only when a real date is stated."),
    duration: { type: ["string", "null"], enum: ["LT_1_MONTH", "ONE_TO_3_MONTHS", "THREE_TO_6_MONTHS", "GT_6_MONTHS", null], description: "Contract length bucket, if stated." },
    budgetType: { type: ["string", "null"], enum: ["HOURLY", "FIXED", null], description: "HOURLY for a rate, FIXED for a total. Null if no money is stated." },
    budgetMin: num("Lower bound in whole dollars. A single figure goes in min and max."),
    budgetMax: num("Upper bound in whole dollars."),
  },
} as const;

const SD_SYSTEM = `You convert a pasted job posting into Panameer's Service Description standard.

Return ONLY what the posting states. Leave a field null (or a list empty) when it does not say.
Never output a person's name, email, phone number, the recruiter or staffing agency, or the end client's name.
Skills, domains and the product are terms as written — do not invent adjacent tools.
Money only from a stated figure. "ASAP" goes in startText, never startDate.`;

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(\s*(x|ext\.?)\s*\d+)?/gi;
const URL_PROFILE = /https?:\/\/\S*(linkedin|calendly|wa\.me)\S*/gi;
const SIGN_OFF = /^(thanks|thank you|regards|best regards|warm regards|best|sincerely|cheers)[,!.]?\s*$/i;
const RECRUITER_LINE = /\b(recruiter|talent acquisition|account manager|staffing|sourcing specialist|hr manager|reach (me|out)|contact me|call me|email me|send (your|me) (resume|cv))\b/i;

/** SD-E002: names, emails, phones and recruiter sign-offs come out before anything is read or saved. */
export function stripContacts(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (SIGN_OFF.test(l.trim())) { i += 6; continue; } // the sign-off and the signature block under it
    if (RECRUITER_LINE.test(l)) continue;
    out.push(l.replace(EMAIL, "").replace(URL_PROFILE, "").replace(PHONE, (m) => (m.replace(/\D/g, "").length >= 10 ? "" : m)));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type SdImportOutcome = { ok: true; data: AiServiceDescription; ms: number } | { ok: false; reason: "no_key" | "truncated" | "error" | "refusal" | "deadline"; message: string };

// ── PC-E001: pass 1 — which Category › Business Type is this posting? (from the shown Category Hierarchy) ─────────
export type HierarchyOption = { category: string; businessTypes: { name: string; usesSkills: boolean; description: string | null }[] };
export type PostingClass = { category: string | null; businessType: string | null; confidence: "high" | "medium" | "low" };

const CLASS_SCHEMA = z.object({ category: z.string().nullable(), businessType: z.string().nullable(), confidence: z.enum(["high", "medium", "low"]) });

export async function aiClassifyPosting(text: string, hierarchy: HierarchyOption[]): Promise<PostingClass | null> {
  const menu = hierarchy.map((h) => `${h.category}: ${h.businessTypes.map((b) => (b.description ? `${b.name} (${b.description})` : b.name)).join("; ")}`).join("\n");
  const call = await callExtractionModel({
    timeoutMs: 25_000,
    system: `You classify a job posting into Panameer's Category Hierarchy. Pick exactly one Category and one of ITS Business Types, using the names exactly as listed.
Oracle / ERP / Fusion / EBS / PeopleSoft / EPM / Workday implementation or support work is "ERP & Oracle" › "Corporate Systems".
confidence: high = clearly this one; medium = probably; low = none fits well (then you may return nulls).

${menu}`,
    // Names only from the hierarchy — the model can't invent or merge them.
    schema: { type: "object", additionalProperties: false, required: ["category", "businessType", "confidence"], properties: { category: { type: ["string", "null"], enum: [...hierarchy.map((h) => h.category), null] }, businessType: { type: ["string", "null"], enum: [...new Set(hierarchy.flatMap((h) => h.businessTypes.map((b) => b.name))), null] }, confidence: { type: "string", enum: ["high", "medium", "low"] } } },
    schemaName: "classify_posting",
    text: stripContacts(text).slice(0, 12_000),
    instruction: "Which Category and Business Type is this posting?",
    tag: "posting",
    toolDescription: "Record the Category and Business Type for this posting.",
    maxOutputTokens: 3_000,
  });
  if (!call.ok) return null;
  const parsed = CLASS_SCHEMA.safeParse(call.value);
  if (!parsed.success) return null;
  // Only names that exist, and a Business Type inside the picked Category ("Category: Business Type" is split).
  const [c0, b0] = (parsed.data.category ?? "").split(/\s*[:›]\s*/);
  if (b0 && !hierarchy.some((h) => h.businessTypes.some((x) => x.name.toLowerCase() === (parsed.data.businessType ?? "").toLowerCase() && h.category.toLowerCase() === c0.toLowerCase()))) parsed.data.businessType = b0;
  const cat = hierarchy.find((h) => h.category.toLowerCase() === (c0 ?? "").toLowerCase());
  const bt = cat?.businessTypes.find((b) => b.name.toLowerCase() === (parsed.data.businessType ?? "").toLowerCase());
  if (!cat || !bt) return { category: cat?.category ?? null, businessType: null, confidence: "low" };
  return { category: cat.category, businessType: bt.name, confidence: parsed.data.confidence };
}

/** SM-E003: the RDS domains a posting may name (themes like "Finance Transformation" are Specialties, not domains). */
export const RDS_DOMAINS = ["P2P", "O2C", "R2R", "SCM", "HCM", "CX", "EPM", "PPM", "GRC"] as const;

const SKILL_MAP_HINTS = `Map the posting's phrases to the catalog's module names; never copy a long phrase. Examples:
"Procurement and Requisition Management" → Purchase Orders + Self-Service Procurement; "Contract Lifecycle Management" → Procurement Contracts;
"Invoice Processing", "Matching", "Accounts Payable" → Payables; "Payment Processing" → Payments; "Supplier Registration and Onboarding",
"Supplier Portal" → Supplier Registration / Supplier Qualification Management / Supplier Management; "Payments" → Payments & Cash Management.
"Purchase Order Management" is P2P (Purchase Orders / Purchase Order Management) — never Order Management, which is O2C sales orders.
A generic word on its own
(Accounting, Onboarding, Management, Processing, Order) is never a skill.`;

/** PC-E001: pass 2 — the six parts, using the picked Business Type's WHO fields (RDS only where it uses skills).
 *  SM-E001/E003: with a catalog, `skills` and `domains` may only be names from it (enums). */
export async function aiExtractServiceDescription(text: string, bt?: { category: string; name: string; usesSkills: boolean; types: string[] } | null, catalog?: { skills: string[]; workRoles?: string[] } | null): Promise<SdImportOutcome> {
  const who = !bt
    ? ""
    : bt.usesSkills
      ? `\nThis posting is ${bt.category} › ${bt.name}: WHO uses Role › Domain › Skill (RDS) and the software Product.`
      : `\nThis posting is ${bt.category} › ${bt.name}: there is no software role or product — leave roleKind, domains and product null/empty. Put what they must provide or work with (services, equipment, materials, coverage area) in skills, preferring these names when they fit: ${bt.types.slice(0, 40).join(", ")}.`;
  const props = { ...(SD_TOOL.properties as Record<string, unknown>) };
  props.domains = { type: "array", items: { type: "string", enum: [...RDS_DOMAINS] }, description: "Business process domains (RDS) the work covers. Themes such as Finance Transformation go to specialties, not here." };
  if (catalog?.workRoles?.length) props.workRole = { type: ["string", "null"], enum: [...catalog.workRoles, null], description: "The specific role the posting is for (a business process lead or SME doing functional design is a Functional Consultant / Functional Lead)." };
  if (catalog?.skills.length) props.skills = { type: "array", items: { type: "string", enum: catalog.skills }, description: "Catalog skills the posting asks for — only names from this list." };
  const schema = { ...SD_TOOL, properties: props };
  const call = await callExtractionModel({
    timeoutMs: 110_000,
    system: SD_SYSTEM + who + (catalog?.skills.length ? `\n${SKILL_MAP_HINTS}` : ""),
    schema: schema as unknown as Record<string, unknown>,
    schemaName: "record_service_description",
    text: stripContacts(text),
    instruction: "Convert this job posting into a Service Description.",
    tag: "posting",
    toolDescription: "Record the Service Description parts of this posting.",
    maxOutputTokens: 8_000,
  });
  if (!call.ok) return call;
  const parsed = AI_SD_SCHEMA.safeParse(call.value);
  if (!parsed.success) return { ok: false, reason: "error", message: "The model returned a shape we could not read." };
  const d = parsed.data;
  const clean = (xs: string[], n = 40) => [...new Set(xs.map((s) => s.replace(EMAIL, "").replace(PHONE, "").trim()).filter(Boolean))].slice(0, n);
  const money = (n: number | null) => (n !== null && n > 0 && Number.isFinite(n) ? n : null);
  let [min, max] = [money(d.budgetMin), money(d.budgetMax)];
  if (min !== null && max !== null && max < min) [min, max] = [max, min];
  return {
    ok: true,
    ms: call.ms,
    data: {
      ...d,
      title: d.title?.trim() || null,
      summary: d.summary?.trim() || null,
      skills: clean(d.skills),
      otherSkills: clean(d.otherSkills, 20).filter((x) => x.split(/\s+/).length <= 4),
      domains: clean(d.domains, 8).filter((x) => (RDS_DOMAINS as readonly string[]).includes(x)),
      credentials: clean(d.credentials, 12),
      specialties: clean(d.specialties, 8),
      responsibilities: clean(d.responsibilities, 20),
      mustHave: clean(d.mustHave, 20),
      niceToHave: clean(d.niceToHave, 20),
      onsiteDaysPerWeek: d.onsiteDaysPerWeek && d.onsiteDaysPerWeek > 0 && d.onsiteDaysPerWeek <= 7 ? Math.round(d.onsiteDaysPerWeek) : null,
      yearsExperience: d.yearsExperience && d.yearsExperience > 0 && d.yearsExperience < 50 ? Math.round(d.yearsExperience) : null,
      startDate: d.startDate && /^\d{4}-\d{2}-\d{2}$/.test(d.startDate) ? d.startDate : null,
      endDate: d.endDate && /^\d{4}-\d{2}-\d{2}$/.test(d.endDate) ? d.endDate : null,
      budgetMin: min,
      budgetMax: max,
      budgetType: min === null && max === null ? null : d.budgetType,
    },
  };
}
