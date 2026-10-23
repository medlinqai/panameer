import type { WorkRequestDuration } from "@prisma/client";
import { resolveJobPosted } from "@/lib/work-resolve";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { marketplaceWhere } from "@/lib/visibility";
import { createDraft, resolveBuyer, loadOwned } from "@/lib/work-request";
import { identityVisibleTo, providerLabel, providerNumbers } from "@/lib/provider-number";
import { implementationsBadge, matchBadges, recruiterNumbers, yearsBadge, type MatchBadge } from "@/lib/recruiter-numbers";
import { productPillarName, writeServiceDescription, type ServiceDescription, deepRolesIn } from "@/lib/service-description";
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
    // JS-E003: an Open job nobody was asked on edits normally; once providers are asked it takes an Amendment.
    if (job.status !== "DRAFT" && (job.status !== "OPEN" || (await prisma.sourcingEvent.count({ where: { job_id: id, status: { not: "DRAFT" } } })))) throw new HireError("Providers were asked on this job — use Edit (Amendment).");
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

// MQ-E002: business-process domains, read from a job's domains and a provider's title, skills and areas.
const DOMAIN_WORDS: Record<string, RegExp> = {
  P2P: /\bp2p\b|procure|purchas|payables|supplier|sourcing|\bprc\b|requisition|spend/i,
  R2R: /\br2r\b|record.to.report|general ledger|\bgl\b|fixed assets|\bassets\b|month.end|\bclose\b|intercompany|subledger|cash management|financials?\b/i,
  O2C: /\bo2c\b|order.to.cash|order management|receivables|billing|collections|pricing|configure price/i,
  SCM: /\bscm\b|supply chain|inventory|warehouse|manufactur|logistics|shipping|planning central|product (information|lifecycle)/i,
  HCM: /\bhcm\b|human capital|payroll|absence|benefits|core hr|global human|talent|recruiting|time (&|and) labor|\bhdl\b/i,
  EPM: /\bepm\b|hyperion|planning|consolidation|fccs|epbcs|narrative reporting|essbase|account reconciliation/i,
  CX: /\bcx\b|customer experience|sales cloud|\bservice cloud\b|fusion service|digital sales|cpq/i,
  PPM: /\bppm\b|project (costing|billing|management|contracts)|grants/i,
};
export function domainsIn(text: string): Set<string> {
  return new Set(Object.entries(DOMAIN_WORDS).filter(([, re]) => re.test(text)).map(([k]) => k));
}

export type HireMatch = { personId: string; profileId: string; name: string; company: string | null; photoUrl: string | null;
  /** MR-E002: credential pills (max 4 shown). */
  badges: MatchBadge[]; line: string; rate: string | null; matched: string[]; why: string[]; fit: number; inBudget: boolean;
  /** Their lowest rate is above the job's range (shown lower, marked Above Your Range). */
  aboveRange?: boolean;
  /** Lowest rate in cents (for the suggested range). */
  lowCents?: number | null;
  /** MQ-E001: an Onsite/Hybrid job lists only providers in its state; the rest come after, behind "Show providers outside". */
  outside: boolean;
  /** MQ-E005: hidden by the buyer on this job (restorable). */
  hidden: boolean;
  /** SE-E003: starred onto the job's Shortlist. */
  starred: boolean;
  /** HP-E003: already asked to propose in a Sourcing Event (due = its deadline). */
  requested: { eventId: string; due: string } | null;
  /** HP-E004: no domain and no skill in common (product only) — listed under "Weaker matches". */
  weak: boolean;
  /** SE-E002: the quick-view panel. */
  detail: MatchDetail };
export type MatchDetail = { summary: string; role: string | null; skillsMatched: string; years: number | null;
  /** MR-E004: Oracle Cloud years / Implementations (labels carry ≈ when derived). */
  ocYears: number | null; ocYearsLabel: string | null; implementations: number | null; implementationsLabel: string | null; certifications: string[]; location: string | null; rates: { name: string; rate: string }[]; products: { title: string; price: string | null }[] };
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const PER: Record<string, string> = { HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo" };

/** SD-E004: named matches — ranked by Role, then skill overlap, then Product, then location (Onsite/Hybrid = same state),
 *  then rate inside the budget. Each says why it matched. */
export async function hireMatches(input: HireInput, seesTest: boolean, jobId?: string | null, viewer?: Viewer | null): Promise<HireMatch[]> {
  // HP-E001: opening the matches answers "job posted".
  if (jobId && viewer) await resolveJobPosted(jobId);
  const hiddenSet = new Set(jobId ? (await prisma.jobHiddenProvider.findMany({ where: { job_id: jobId }, select: { provider_person_id: true } })).map((h) => h.provider_person_id) : []);
  const asked = new Map(jobId ? (await prisma.proposalRequest.findMany({ where: { job_id: jobId, sourcing_event_id: { not: null } }, select: { provider_person_id: true, sourcingEvent: { select: { id: true, deadline_at: true } } } })).filter((r) => r.sourcingEvent).map((r) => [r.provider_person_id, { eventId: r.sourcingEvent!.id, due: r.sourcingEvent!.deadline_at.toISOString() }]) : []);
  const starSet = new Set(jobId ? (await prisma.shortlistLine.findMany({ where: { shortlist: { job_id: jobId }, source: { in: ["SHORTLISTED", "ADDED"] } }, select: { provider_person_id: true } })).map((l) => l.provider_person_id) : []);
  const pillarName = productPillarName(input.product);
  const [rows, pillar] = await Promise.all([
    prisma.providerProfile.findMany({
      // PC-E002: the Business Type decides who is matched (the whole Category when none is picked).
      where: { AND: [await marketplaceWhere(seesTest), { person: { company: { businessTypes: { some: input.businessTypeId ? { business_type_id: input.businessTypeId } : { businessType: { commodityGroup: { name: input.category } } } } } } }] },
      select: {
        id: true, overview: true,
        person: { select: { id: true, first_name: true, last_name: true, title: true, photo_url: true, site: { select: { addresses: { take: 1, select: { city: true, state: true } } } }, company: { select: { name: true } } } },
        roles: { select: { role_id: true } },
        capabilities: { select: { workRole: { select: { name: true } } } },
        skills: { select: { skill_id: true, skill: { select: { name: true, area: true, pillar: { select: { name: true } } } } } },
        employers: { select: { start_date: true } },
        credentials: { where: { kind: "CERTIFICATION" }, select: { name: true }, take: 8 },
      },
      take: 400,
    }),
    pillarName ? prisma.pillar.findFirst({ where: { name: pillarName }, select: { name: true } }) : null,
  ]);
  const ids = rows.map((r) => r.id);
  const [services, products, ocNums] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: { in: ids }, active: true, published_at: { not: null } }, select: { provider_profile_id: true, name: true, rate_cents: true, uom: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: { in: ids }, status: "PUBLISHED", offered: true }, select: { provider_profile_id: true, title: true, summary: true, price_cents: true } }),
    recruiterNumbers(ids),
  ]);
  // MQ-E004: count against the job's 10 most important skills — the ones its Required list names first.
  const req = input.required.toLowerCase();
  const ranked = [...input.skills.map((k) => ({ id: k.id as string | null, name: k.name })), ...input.customSkills.map((n) => ({ id: null as string | null, name: n }))]
    .map((k, i) => ({ ...k, i, inReq: req.includes(k.name.toLowerCase()) }))
    .sort((a, b) => Number(b.inReq) - Number(a.inReq) || a.i - b.i)
    .slice(0, 10);
  const wantIds = new Set(ranked.filter((k) => k.id).map((k) => k.id!));
  const wantNames = ranked.map((k) => k.name);
  const customTop = ranked.filter((k) => !k.id).map((k) => k.name);
  const fallback = wantNames.length ? [] : (await suggestSkills(input.category, input.title)).slice(0, 10);
  const min = input.budgetMin != null ? input.budgetMin * 100 : null;
  const max = input.budgetMax != null ? input.budgetMax * 100 : null;
  const onsite = !!input.worksite && input.worksite !== "OFFSITE" && !!input.state.trim();
  // The job's domains: as written (P2P, SCM…) or read from its title when the posting named none.
  const jobDeep = input.specificRole ? [input.specificRole] : deepRolesIn(`${input.title} ${input.summary}`);
  const jobDomains = new Set([...input.domains.flatMap((d) => [...domainsIn(d), ...(DOMAIN_WORDS[d.toUpperCase()] ? [d.toUpperCase()] : [])]), ...(input.domains.length ? [] : domainsIn(input.title))]);
  const scored = rows.map((r) => {
    const addr = r.person.site?.addresses[0];
    const mine = services.filter((x) => x.provider_profile_id === r.id);
    const prods = products.filter((x) => x.provider_profile_id === r.id);
    const corpus = [r.person.title ?? "", r.overview ?? "", ...r.skills.map((k) => k.skill.name), ...mine.map((x) => x.name), ...prods.flatMap((x) => [x.title, x.summary ?? ""])].join(" ").toLowerCase();
    const byId = r.skills.filter((k) => wantIds.has(k.skill_id)).map((k) => k.skill.name);
    const byName = [...customTop, ...fallback].filter((k) => corpus.includes(k.toLowerCase()));
    const matched = [...new Set([...byId, ...byName])];
    const roleHit = !!input.roleId && r.roles.some((x) => x.role_id === input.roleId);
    const theirDeep = new Set([...r.capabilities.map((c) => c.workRole?.name).filter((n): n is string => !!n), ...deepRolesIn(r.person.title ?? "")]);
    const deepHit = jobDeep.find((n) => theirDeep.has(n)) ?? null;
    const productHit = !!pillar && r.skills.some((k) => k.skill.pillar?.name === pillar.name);
    const placeHit = onsite && !!addr?.state && addr.state.toLowerCase() === input.state.trim().toLowerCase();
    const hourly = mine.filter((x) => x.uom === "HOUR" && x.rate_cents != null).map((x) => x.rate_cents!).sort((a, b) => a - b);
    const priced = prods.filter((x) => x.price_cents != null).map((x) => x.price_cents!).sort((a, b) => a - b);
    const basis = input.budgetType === "FIXED" ? priced : hourly;
    const budgetSet = min != null || max != null;
    const inBudget = budgetSet && basis.some((c) => (min == null || c >= min * 0.8) && (max == null || c <= max));
    const aboveRange = max != null && basis.length > 0 && basis[0] > max;
    const starts = r.employers.map((e) => e.start_date?.getTime()).filter((t): t is number => !!t);
    const years = starts.length ? Math.floor((Date.now() - Math.min(...starts)) / (365.25 * 86_400_000)) : null;
    const oc = ocNums.get(r.id);
    // MR-E004: the years term uses Oracle Cloud years when known.
    const fitYears = oc?.years ?? years;
    const total = wantNames.length + fallback.length;
    const theirDomains = domainsIn([r.person.title ?? "", ...r.skills.map((k) => `${k.skill.name} ${k.skill.area ?? ""}`)].join(" "));
    const sharedDomains = [...jobDomains].filter((d) => theirDomains.has(d));
    const why = [
      ...sharedDomains,
      // Only the deepest shared level is worth a chip — the top level ("Application-Specific Roles") says nothing.
      ...(deepHit ? [deepHit] : []),
      ...(matched.length ? [`${matched.length} of ${total} skills`] : []),
      ...(productHit && pillar ? [`Product: ${pillar.name}`] : []),
      ...(placeHit ? [`In ${addr!.state}`] : []),
      ...(years ? [`${years} yrs`] : []),
    ];
    const company = r.person.company?.name && !r.person.company.name.includes(r.person.last_name) ? r.person.company.name : null;
    const m: HireMatch = {
      personId: r.person.id, profileId: r.id, name: `${r.person.first_name} ${r.person.last_name}`.trim(), company, photoUrl: r.person.photo_url, badges: [],
      line: [r.person.title, addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : null].filter(Boolean).join(" · "),
      rate: hourly.length ? `$${Math.round(hourly[0] / 100)}/hr` : priced.length ? `from $${Math.round(priced[0] / 100)}` : null,
      matched: matched.slice(0, 8), why, fit: total ? Math.round((matched.length / total) * 100) : 0, inBudget, aboveRange, lowCents: basis[0] ?? null,
      outside: onsite && !placeHit,
      hidden: hiddenSet.has(r.person.id),
      starred: starSet.has(r.person.id),
      requested: asked.get(r.person.id) ?? null,
      weak: sharedDomains.length === 0 && matched.length === 0,
      detail: {
        summary: (r.overview ?? "").slice(0, 600), role: deepHit ?? [...theirDeep][0] ?? r.person.title ?? null,
        skillsMatched: `${matched.length} of ${Math.min(total, 10) || 10}`, years,
        ocYears: oc?.years ?? null, ocYearsLabel: yearsBadge(oc), implementations: oc?.implementations ?? null, implementationsLabel: implementationsBadge(oc),
        certifications: r.credentials.map((c) => c.name),
        location: addr?.city ? [addr.city, addr.state].filter(Boolean).join(", ") : addr?.state ?? null,
        rates: mine.filter((x) => x.rate_cents != null).slice(0, 6).map((x) => ({ name: x.name, rate: `${money(x.rate_cents!)}${PER[x.uom ?? ""] ?? ""}` })),
        products: prods.slice(0, 6).map((x) => ({ title: x.title, price: x.price_cents != null ? money(x.price_cents) : null })),
      },
    };
    // Role + Domain (strong) + skills + Product + years; with job domains, a provider sharing none ranks below all who share one.
    const score = (deepHit ? 45 : roleHit ? 15 : 0) + sharedDomains.length * 40 + matched.length * 5 + Number(productHit) * 10 + Math.min(fitYears ?? 0, 20) / 2;
    return { m, key: [Number(!(onsite && !placeHit)), jobDomains.size ? Number(sharedDomains.length > 0) : 1, Number(!aboveRange), score, Number(inBudget)] };
  });
  const relevant = scored.filter((x) => x.key[2] > 0);
  const top = (relevant.length ? relevant : scored)
    .sort((a, b) => { for (let i = 0; i < a.key.length; i++) if (b.key[i] !== a.key[i]) return b.key[i] - a.key[i]; return a.m.name.localeCompare(b.m.name); })
    .slice(0, 40)
    .map((x) => x.m);
  const badges = await matchBadges(top.map((m) => ({ profileId: m.profileId, personId: m.personId, certifications: m.detail.certifications })), ocNums);
  for (const m of top) m.badges = badges.get(m.profileId) ?? [];
  // AN-E003: no name or company until a Work Order exists (MR-E001: the photo shows) — "Provider P-1038" (title, city, rate and skills stay).
  const [seen, numbers] = await Promise.all([identityVisibleTo(viewer ?? null, top.map((m) => m.personId)), providerNumbers(top.map((m) => m.profileId))]);
  return top.map((m) => (seen.has(m.personId) ? m : { ...m, name: providerLabel(numbers.get(m.profileId)), company: null }));
}

/** HB-E004: discard a draft job (closed, never deleted — it stays readable). */
export async function discardDraft(viewer: Viewer, jobId: string) {
  const { pAccountId } = await resolveBuyer(viewer);
  const job = await loadOwned(viewer, jobId, pAccountId);
  if (job.status !== "DRAFT") throw new HireError("Only a draft can be discarded.");
  await prisma.job.update({ where: { id: jobId }, data: { status: "CANCELED" } });
}

/** MQ-E005: hide a provider from this job's matches, or bring them back (owner only). */
export async function setHidden(viewer: Viewer, jobId: string, providerPersonId: string, hidden: boolean) {
  const { pAccountId } = await resolveBuyer(viewer);
  await loadOwned(viewer, jobId, pAccountId);
  if (hidden) await prisma.jobHiddenProvider.upsert({ where: { job_id_provider_person_id: { job_id: jobId, provider_person_id: providerPersonId } }, create: { job_id: jobId, provider_person_id: providerPersonId }, update: {} });
  else await prisma.jobHiddenProvider.deleteMany({ where: { job_id: jobId, provider_person_id: providerPersonId } });
}

/** "Request Availability": proposal requests on the Job's requisition line, answer within 7 days. */
export async function requestProposals(viewer: Viewer, jobId: string, providerPersonIds: string[]) {
  const req = await requisitionForJob(jobId);
  await ensureFirstLine(jobId, req.id);
  const line = await prisma.workRequestLine.findFirstOrThrow({ where: { work_request_id: req.id }, orderBy: { line_number: "asc" }, select: { id: true } });
  return inviteProviders(viewer, jobId, { lineId: line.id, providerPersonIds, respondsBy: new Date(Date.now() + 7 * 86_400_000).toISOString() });
}


/** Required rate range: suggest one from what matching providers charge (middle half of their lowest rates). */
export async function suggestRange(input: HireInput, seesTest: boolean): Promise<{ min: number; max: number; n: number } | null> {
  const ms = await hireMatches({ ...input, budgetMin: null, budgetMax: null }, seesTest, null, null);
  const c = ms.filter((m) => !m.weak).map((m) => m.lowCents).filter((x): x is number => x != null && x > 0).sort((a, b) => a - b);
  if (c.length < 2) return null;
  const q = (p: number) => c[Math.min(c.length - 1, Math.max(0, Math.round(p * (c.length - 1))))];
  const r = (x: number) => Math.round(x / 500) * 5; // to the nearest $5
  const min = r(q(0.25)), max = r(q(0.75));
  return { min, max: Math.max(max, min + 5), n: c.length };
}
