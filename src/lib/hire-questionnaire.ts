import type { WorkRequestDuration } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { marketplaceWhere } from "@/lib/visibility";
import { createDraft, resolveBuyer, loadOwned } from "@/lib/work-request";
import { writeServiceDescription, type ServiceDescription } from "@/lib/service-description";
import { requisitionForJob } from "@/lib/requisition";
import { ensureFirstLine } from "@/lib/work-request-lines";
import { inviteProviders } from "@/lib/work-request-invite";
import { shopCategoryNames } from "@/lib/shop-category-list";

// SD-E003: Hire follows the Service Description standard — The Work · Where · Contract · Who · When & Rate — saved as a
// draft Job (optionally parsed from an uploaded posting), then named matches; checked ones get proposal requests on that Job.
export const HOW_LONG: { value: WorkRequestDuration; label: string }[] = [
  { value: "LT_1_MONTH", label: "Less than 1 month" },
  { value: "ONE_TO_3_MONTHS", label: "1 to 3 months" },
  { value: "THREE_TO_6_MONTHS", label: "3 to 6 months" },
  { value: "GT_6_MONTHS", label: "Ongoing / 6+ months" },
];
export type HireInput = ServiceDescription;

export class HireError extends Error {}

/** The buyer's Ship-To addresses (for "Onsite at …"). */
export async function shipTos(viewer: Viewer) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { company_id: true } });
  if (!me) return [];
  const rows = await prisma.address.findMany({ where: { is_ship_to: true, site: { company_id: me.company_id } }, select: { id: true, line1: true, city: true, state: true } });
  return rows.map((a) => ({ id: a.id, label: [a.line1, a.city, a.state].filter(Boolean).join(", "), city: a.city, state: a.state }));
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 2 && !STOP.has(w));
const STOP = new Set(["and", "for", "the", "with", "our", "need", "needs", "help", "company", "business", "small", "new", "set", "get", "per", "who", "can"]);

/** What the Category sells and knows — skill names (where it uses skills) plus its stock rate and product types. */
async function vocabulary(category: string): Promise<string[]> {
  const bts = await prisma.businessType.findMany({ where: { commodityGroup: { name: category } }, select: { id: true, uses_skills: true } });
  const btIds = bts.map((b) => b.id);
  const [skills, types] = await Promise.all([
    prisma.skill.findMany({ where: { business_type_id: { in: bts.filter((b) => b.uses_skills).map((b) => b.id) }, status: "ACTIVE", is_custom: false, visible_to_members: true }, select: { name: true }, take: 2000 }),
    prisma.serviceType.findMany({ where: { hidden: false, merged_into_id: null, OR: [{ serviceCategory: { business_type_id: { in: btIds } } }, { serviceCategory: { commodityGroup: { name: category } } }] }, select: { name: true } }),
  ]);
  return [...new Set([...types.map((t) => t.name), ...skills.map((s) => s.name)])];
}

/** Skills suggested from the title: the Category's names that share a word with it, else its most common types. */
export async function suggestSkills(category: string, title: string): Promise<string[]> {
  if (!(await shopCategoryNames()).includes(category)) return [];
  const vocab = await vocabulary(category);
  const t = new Set(words(title));
  const scored = vocab.map((v) => ({ v, n: words(v).filter((w) => t.has(w) || [...t].some((x) => x.length > 3 && (w.startsWith(x) || x.startsWith(w)))).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const picked = scored.slice(0, 8).map((x) => x.v);
  return picked.length >= 3 ? picked : [...new Set([...picked, ...vocab.slice(0, 8 - picked.length)])];
}

/** Save (create or update) the draft Job from the questionnaire. */
export async function saveHireJob(viewer: Viewer, jobId: string | null, input: HireInput): Promise<string> {
  if (!(await shopCategoryNames()).includes(input.category)) throw new HireError("Pick a Category.");
  if (input.title.trim().length < 3) throw new HireError("Give it a short title.");
  let id = jobId;
  if (id) {
    const { pAccountId } = await resolveBuyer(viewer);
    const job = await loadOwned(viewer, id, pAccountId);
    if (job.status !== "DRAFT") throw new HireError("This job is already posted.");
  } else {
    id = (await createDraft(viewer)).id;
  }
  await writeServiceDescription(id, input);
  return id;
}

/** A typed skill: the catalog's own when the name matches, else kept as the buyer wrote it. */
export async function resolveSkill(name: string): Promise<{ id: string; name: string } | null> {
  const n = name.trim();
  if (n.length < 2) return null;
  return prisma.skill.findFirst({ where: { name: { equals: n, mode: "insensitive" }, is_custom: false, status: "ACTIVE" }, select: { id: true, name: true } });
}

export type HireMatch = { personId: string; profileId: string; name: string; company: string | null; line: string; rate: string | null; matched: string[]; why: string[]; fit: number; inBudget: boolean };

/** Named matches for the questionnaire: sellers in the Category, ranked by skill fit, then rate inside the budget. */
export async function hireMatches(input: HireInput, seesTest: boolean): Promise<HireMatch[]> {
  const rows = await prisma.providerProfile.findMany({
    where: { AND: [await marketplaceWhere(seesTest), { person: { company: { businessTypes: { some: { businessType: { commodityGroup: { name: input.category } } } } } } }] },
    select: {
      id: true, overview: true,
      person: { select: { id: true, first_name: true, last_name: true, title: true, site: { select: { addresses: { take: 1, select: { city: true, state: true } } } }, company: { select: { name: true } } } },
      skills: { select: { skill: { select: { name: true } } } },
    },
    take: 300,
  });
  const ids = rows.map((r) => r.id);
  const [services, products] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: { in: ids }, active: true, published_at: { not: null } }, select: { provider_profile_id: true, name: true, rate_cents: true, uom: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: { in: ids }, status: "PUBLISHED", offered: true }, select: { provider_profile_id: true, title: true, summary: true, price_cents: true } }),
  ]);
  const named = [...input.skills.map((k) => k.name), ...input.customSkills];
  const wanted = named.length ? named : await suggestSkills(input.category, input.title);
  const min = input.budgetMin != null ? input.budgetMin * 100 : null;
  const max = input.budgetMax != null ? input.budgetMax * 100 : null;
  const out: HireMatch[] = [];
  for (const r of rows) {
    const addr = r.person.site?.addresses[0];
    if (input.worksite && input.worksite !== "OFFSITE" && input.state && addr?.state && addr.state.toLowerCase() !== input.state.toLowerCase()) continue;
    const mine = services.filter((s) => s.provider_profile_id === r.id);
    const corpus = [r.person.title ?? "", r.overview ?? "", ...r.skills.map((s) => s.skill.name), ...mine.map((s) => s.name), ...products.filter((p) => p.provider_profile_id === r.id).flatMap((p) => [p.title, p.summary ?? ""])].join(" ").toLowerCase();
    const matched = wanted.filter((k) => corpus.includes(k.toLowerCase()) || words(k).every((w) => corpus.includes(w)));
    const hourly = mine.filter((s) => s.uom === "HOUR" && s.rate_cents != null).map((s) => s.rate_cents!).sort((a, b) => a - b);
    const priced = products.filter((p) => p.provider_profile_id === r.id && p.price_cents != null).map((p) => p.price_cents!).sort((a, b) => a - b);
    const basis = input.budgetType === "HOURLY" ? hourly : priced;
    const inBudget = basis.length > 0 && basis.some((c) => (min == null || c >= min * 0.8) && (max == null || c <= max));
    const company = r.person.company?.name && !r.person.company.name.includes(r.person.last_name) ? r.person.company.name : null;
    out.push({
      personId: r.person.id, profileId: r.id,
      name: `${r.person.first_name} ${r.person.last_name}`.trim(), company,
      line: [r.person.title, addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : null].filter(Boolean).join(" · "),
      rate: hourly.length ? `$${Math.round(hourly[0] / 100)}/hr` : priced.length ? `from $${Math.round(priced[0] / 100)}` : null,
      matched, why: [], fit: wanted.length ? Math.round((matched.length / wanted.length) * 100) : 0, inBudget,
    });
  }
  return out.sort((a, b) => b.fit - a.fit || Number(b.inBudget) - Number(a.inBudget) || a.name.localeCompare(b.name)).slice(0, 20);
}

/** "Request proposals": proposal requests on the Job's requisition line, answer within 7 days. */
export async function requestProposals(viewer: Viewer, jobId: string, providerPersonIds: string[]) {
  const req = await requisitionForJob(jobId);
  await ensureFirstLine(jobId, req.id);
  const line = await prisma.workRequestLine.findFirstOrThrow({ where: { work_request_id: req.id }, orderBy: { line_number: "asc" }, select: { id: true } });
  return inviteProviders(viewer, jobId, { lineId: line.id, providerPersonIds, respondsBy: new Date(Date.now() + 7 * 86_400_000).toISOString() });
}
