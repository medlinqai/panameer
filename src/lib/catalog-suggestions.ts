import type { ServiceKind, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sellerCategoryWhere } from "@/lib/business-types";
import { companyIdForProfile } from "@/lib/company-catalog";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { personBusinessTypes } from "@/lib/business-types";
import { LIVE_TYPE, saveCatalogService } from "@/lib/build-catalog";
import { callExtractionModel } from "@/lib/resume/ai-provider";

// BT-E003: Résumé → draft My Catalog items. The AI picks from the business type's stock types (services: a rate only
// when the résumé states one; service products: only when it names a deliverable). Fallback rules when no AI is
// configured or the call fails. Each proposal and the provider's Keep / Remove is stored — the tuning log.
type StockType = { id: string; name: string; kind: ServiceKind; units: ServiceUnit[] };
type Proposal = { typeId: string; why: string; rateCents?: number | null; unit?: ServiceUnit | null; title?: string | null };

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) throw new Error("No provider profile");
  return p;
}

async function stockTypes(personId: string): Promise<StockType[]> {
  const bts = await personBusinessTypes(personId);
  if (!bts.length) return [];
  const all = await prisma.serviceType.findMany({ where: { serviceCategory: { AND: [await sellerCategoryWhere(personId), { hidden: false }] }, ...LIVE_TYPE }, orderBy: { sort_order: "asc" }, select: { id: true, name: true, kind: true, units: true } });
  return all.filter((t) => t.kind === "SERVICE_PRODUCT" || rateTypeName(t.name));
}

/** The newest parsed résumé not yet read for suggestions. */
export async function pendingImport(profileId: string) {
  return prisma.profileImport.findFirst({ where: { provider_profile_id: profileId, status: "PARSED", catalog_suggested_at: null, raw_text: { not: null } }, orderBy: { created_at: "desc" }, select: { id: true, raw_text: true } });
}

// MC-E008: services are the four rate types only (old names until scripts/my-catalog-rates.ts is applied).
const RATE_TYPES: Record<string, string[]> = { "Onsite Hourly": ["Onsite Consulting"], "Offsite Hourly": ["Offsite Consulting", "Remote Consulting"], "Monthly Retainer": [], Mentoring: [] };
const rateTypeName = (name: string) => Object.entries(RATE_TYPES).find(([k, v]) => k === name || v.includes(name))?.[0] ?? null;
const byName = (types: StockType[], name: string) => types.find((t) => t.name === name || rateTypeName(t.name) === name);

// ---- fallback rules: keyword → stock type name, with the résumé line as the "why" ----
const RULES: { type: string; re: RegExp }[] = [
  { type: "Offsite Hourly", re: /\b(consult(ant|ing)?|advis(or|ory))\b/i },
  { type: "Onsite Hourly", re: /\b(on[- ]?site|client site|travel(ed|led)? to)\b/i },
  { type: "Monthly Retainer", re: /\b(retainer|AMS|managed services|production support)\b/i },
  { type: "Mentoring", re: /\b(mentor(ed|ing)?|coach(ed|ing)?)\b/i },
  { type: "Reports", re: /\b\d+\+?\s+(BIP|OTBI|BI Publisher|custom)?\s*reports?\b|\b(BIP|OTBI|BI Publisher) reports?\b/i },
  { type: "Dashboards & Analytics", re: /\b(dashboards?|analytics|FAW|OAC)\b/i },
  { type: "Integrations & Interfaces", re: /\b(integrations?|interfaces?|OIC|middleware|APIs?)\b/i },
  { type: "Conversions (Data Loads)", re: /\b(conversions?|data (loads?|migration)|FBDI|HDL)\b/i },
  { type: "Extensions & Workflows", re: /\b(extensions?|workflows?|VBCS|personali[sz]ations?)\b/i },
  { type: "Health Checks & Assessments", re: /\b(health ?checks?|assessments?|audits? of)\b/i },
  { type: "Configuration & Setup", re: /\b(configur(ed|ation)|set ?up|implement(ed|ation))\b/i },
  { type: "AI Agents", re: /\b(AI agents?|agentic|LLM)\b/i },
];
const RATE = /\$\s?([\d,]{2,6})(?:\.\d{2})?\s*(?:\/|per\s)\s*(hour|hr|day|week|month)\b/i;
const UNIT_OF: Record<string, ServiceUnit> = { hour: "HOUR", hr: "HOUR", day: "DAY", week: "WEEK", month: "MONTH" };

function byRules(text: string, types: StockType[]): Proposal[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const rate = RATE.exec(text);
  const out: Proposal[] = [];
  for (const r of RULES) {
    const t = byName(types, r.type);
    const line = t && lines.find((l) => r.re.test(l));
    if (!t || !line) continue;
    const isService = t.kind === "SERVICE";
    const unit = rate ? UNIT_OF[rate[2].toLowerCase()] : null;
    out.push({
      typeId: t.id,
      why: line.slice(0, 160),
      ...(isService && rate && unit && t.units.includes(unit) ? { rateCents: Number(rate[1].replace(/,/g, "")) * 100, unit } : {}),
      ...(!isService ? { title: line.slice(0, 80) } : {}),
    });
  }
  return out;
}

async function byAi(text: string, types: StockType[]): Promise<{ proposals: Proposal[]; model: string } | null> {
  const services = types.filter((t) => t.kind === "SERVICE").map((t) => t.name);
  const products = types.filter((t) => t.kind === "SERVICE_PRODUCT").map((t) => t.name);
  const system = `You draft a provider's catalog from their résumé. Pick ONLY from these lists.
Services (stock types): ${services.join("; ")}.
Service products (stock types): ${products.join("; ")}.
Rules:
- Services are rates. Propose one only when the résumé shows that kind of work (consulting history → ${services.find((n) => rateTypeName(n) === "Offsite Hourly") ?? "Offsite Hourly"}; worked at client sites → ${services.find((n) => rateTypeName(n) === "Onsite Hourly") ?? "Onsite Hourly"}; ongoing support/AMS → Monthly Retainer; mentoring or coaching → Mentoring). Training, go-live and support projects are not services.
- Fill rate (in whole dollars) and unit (hour/day/week/month) ONLY when the résumé states a rate. Otherwise null. Never guess.
- Propose a service product only when the résumé clearly names a deliverable (e.g. "built 40 BIP reports" → Reports); give it a short title from the résumé.
- "why" is one short line quoting or closely paraphrasing the résumé.`;
  const schema = {
    type: "object", additionalProperties: false, required: ["services", "products"],
    properties: {
      services: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "why", "rate", "unit"], properties: { type: { type: "string" }, why: { type: "string" }, rate: { type: ["number", "null"] }, unit: { type: ["string", "null"] } } } },
      products: { type: "array", items: { type: "object", additionalProperties: false, required: ["type", "title", "why"], properties: { type: { type: "string" }, title: { type: "string" }, why: { type: "string" } } } },
    },
  };
  const r = await callExtractionModel({ system, schema, schemaName: "catalog_drafts", text: text.slice(0, 40_000), maxOutputTokens: 2_000, instruction: "Draft catalog items from this résumé.", tag: "catalog", toolDescription: "Record the draft catalog items.", timeoutMs: 45_000 });
  if (!r.ok) return null;
  const v = r.value as { services?: { type: string; why: string; rate: number | null; unit: string | null }[]; products?: { type: string; title: string; why: string }[] };
  const find = (name: string, kind: ServiceKind) => types.find((t) => t.kind === kind && t.name.toLowerCase() === name.trim().toLowerCase());
  const proposals: Proposal[] = [];
  for (const s of v.services ?? []) {
    const t = find(s.type, "SERVICE");
    if (!t || !s.why?.trim()) continue;
    const unit = s.unit ? UNIT_OF[s.unit.toLowerCase()] ?? null : null;
    proposals.push({ typeId: t.id, why: s.why.trim().slice(0, 160), ...(s.rate && s.rate > 0 && unit && t.units.includes(unit) ? { rateCents: Math.round(s.rate * 100), unit } : {}) });
  }
  for (const p of v.products ?? []) {
    const t = find(p.type, "SERVICE_PRODUCT");
    if (t && p.why?.trim()) proposals.push({ typeId: t.id, why: p.why.trim().slice(0, 160), title: (p.title || t.name).slice(0, 80) });
  }
  return { proposals, model: r.model };
}

/** MC-E008: a rate stated on the résumé fills Offsite Hourly only; any other drafted rate starts at $100 for the provider to change. Products keep no price. */
const RATE_FROM_RESUME_TYPE = "Offsite Hourly";
const DEFAULT_RATE_CENTS = 100_00;
function applyRatePolicy(proposals: Proposal[], types: StockType[]): Proposal[] {
  return proposals.map((x) => {
    const t = types.find((y) => y.id === x.typeId);
    if (!t || t.kind !== "SERVICE") return x;
    if (rateTypeName(t.name) === RATE_FROM_RESUME_TYPE && x.rateCents && x.unit) return x;
    const unit: ServiceUnit = t.units.includes("HOUR") ? "HOUR" : (t.units[0] as ServiceUnit);
    return { ...x, rateCents: DEFAULT_RATE_CENTS, unit };
  });
}

/** Read the newest résumé for suggestions (once per import). Skips types the provider already offers or was offered. */
export async function proposeFromResume(viewer: Viewer): Promise<{ proposed: number; source: string } | null> {
  const p = await me(viewer);
  const imp = await pendingImport(p.id);
  if (!imp?.raw_text) return null;
  const types = await stockTypes(p.person_id);
  let source = "rules";
  let proposals: Proposal[] = [];
  if (types.length) {
    const ai = await byAi(imp.raw_text, types).catch(() => null);
    if (ai) { proposals = ai.proposals; source = `ai:${ai.model}`; } else proposals = byRules(imp.raw_text, types);
  }
  const [svc, prod, seen] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, service_type_id: { not: null } }, select: { service_type_id: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, service_type_id: { not: null } }, select: { service_type_id: true } }),
    prisma.catalogSuggestion.findMany({ where: { provider_profile_id: p.id }, select: { service_type_id: true } }),
  ]);
  const skip = new Set([...svc, ...prod, ...seen].map((x) => x.service_type_id!));
  proposals = applyRatePolicy(proposals, types);
  const fresh = proposals.filter((x, i) => !skip.has(x.typeId) && proposals.findIndex((y) => y.typeId === x.typeId) === i);
  const kindOf = new Map(types.map((t) => [t.id, t.kind]));
  await prisma.$transaction([
    ...fresh.map((x) => prisma.catalogSuggestion.create({ data: { provider_profile_id: p.id, profile_import_id: imp.id, service_type_id: x.typeId, kind: kindOf.get(x.typeId)!, why: x.why, rate_cents: x.rateCents ?? null, unit: x.unit ?? null, title: x.title ?? null, source } })),
    prisma.profileImport.update({ where: { id: imp.id }, data: { catalog_suggested_at: new Date() } }),
  ]);
  return { proposed: fresh.length, source };
}

export async function openSuggestions(profileId: string) {
  return prisma.catalogSuggestion.findMany({ where: { provider_profile_id: profileId, status: "PROPOSED" }, orderBy: [{ kind: "asc" }, { created_at: "asc" }] });
}

/** Keep: a service becomes a draft Service (rate if stated); a product becomes a draft Service Product with no price. */
export async function keepSuggestion(viewer: Viewer, id: string, input: { rateCents?: number | null; unit?: ServiceUnit | null } = {}) {
  const p = await me(viewer);
  const s = await prisma.catalogSuggestion.findFirst({ where: { id, provider_profile_id: p.id, status: "PROPOSED" } });
  if (!s) throw new Error("That suggestion isn't open");
  if (s.kind === "SERVICE") {
    await saveCatalogService(viewer, { serviceTypeId: s.service_type_id, on: true, rateCents: input.rateCents ?? s.rate_cents, unit: input.unit ?? s.unit });
  } else {
    const t = await prisma.serviceType.findUniqueOrThrow({ where: { id: s.service_type_id }, select: { name: true, pricing_model: true } });
    await prisma.serviceProduct.create({ data: { provider_profile_id: p.id, company_id: await companyIdForProfile(p.id), title: s.title || t.name, status: "DRAFT", service_type_id: s.service_type_id, pricing_type: t.pricing_model === "RECURRING" ? "RECURRING" : "FIXED", ...(t.pricing_model === "RECURRING" ? { billing_period: "MONTHLY", kind: "DEPLOYABLE" } : {}) } });
  }
  await prisma.catalogSuggestion.update({ where: { id: s.id }, data: { status: "KEPT", decided_at: new Date() } });
}

export async function removeSuggestion(viewer: Viewer, id: string) {
  const p = await me(viewer);
  const n = await prisma.catalogSuggestion.updateMany({ where: { id, provider_profile_id: p.id, status: "PROPOSED" }, data: { status: "REMOVED", decided_at: new Date() } });
  if (!n.count) throw new Error("That suggestion isn't open");
}
