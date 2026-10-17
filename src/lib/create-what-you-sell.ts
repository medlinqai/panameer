import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { personBusinessTypes, sellerTypeByName } from "@/lib/business-types";
import { saveCatalogService, publishCatalog, ensureDefaultRates } from "@/lib/build-catalog";
import { saveCatalogProduct, publishCatalogProduct, productTypes } from "@/lib/catalog-products";
import { addIndustries } from "@/lib/industry";
import { publishProfile, recomputeCompleteness } from "@/lib/onboarding";
import { capabilitiesFor } from "@/lib/capabilities";
import { taxonomyV2 } from "@/lib/platform-settings";
import { SELF_ADDED_WEIGHT } from "@/lib/provider-rollup";

// CWS-E002–E005: Create What You Sell, slimmed — What You Do · What You Charge · Enable My Catalog. Owner-scoped from the session.
export class CwsError extends Error {}
const HOURLY = ["Onsite Hourly", "Offsite Hourly"];
const MONTHLY = "Monthly Retainer";
export const MAX_PACKAGES = 3;
/** Same limit as the title editor (a client module, so not imported here). */
const HEADLINE_MAX = 42;

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true, role_id: true, onboarding_completed_at: true } });
  if (!p) throw new CwsError("No seller profile");
  return p;
}

export type Pkg = { id?: string | null; name: string; included: string; priceCents: number | null; perMonth: boolean; readyDays: number | null };

export async function createState(viewer: Viewer) {
  const p = await me(viewer);
  await ensureDefaultRates(viewer).catch(() => null);
  const [person, skills, jobSkills, bts, industries, allIndustries, services, products] = await Promise.all([
    prisma.person.findUnique({ where: { id: p.person_id }, select: { title: true } }),
    prisma.providerSkill.findMany({ where: { provider_profile_id: p.id }, orderBy: { weight: "desc" }, select: { skill: { select: { id: true, name: true } } } }),
    prisma.jobSkill.findMany({ where: { OR: [{ employer: { provider_profile_id: p.id } }, { project: { provider_profile_id: p.id } }] }, select: { skill: { select: { id: true, name: true } } } }),
    personBusinessTypes(p.person_id),
    prisma.providerProfileSpecialization.findMany({ where: { provider_profile_id: p.id, specialization: { kind: "INDUSTRY" } }, select: { specialization: { select: { id: true, name: true } } } }),
    prisma.specialization.findMany({ where: { kind: "INDUSTRY", status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null } }, select: { name: true, rate_cents: true, uom: true, hours_included: true, published_at: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], take: MAX_PACKAGES, select: { id: true, title: true, summary: true, price_cents: true, pricing_type: true, lead_time_days: true, status: true } }),
  ]);
  const have = new Set(skills.map((s) => s.skill.id));
  // Suggestions: the résumé first, then the company's business type — most used first, never A–Z.
  const fromResume = [...new Map(jobSkills.map((j) => [j.skill.id, j.skill])).values()].filter((s) => !have.has(s.id));
  const fromType = bts.length
    ? await prisma.skill.findMany({ where: { business_type_id: { in: bts.map((b) => b.id) }, status: "ACTIVE", merged_into_id: null, id: { notIn: [...have, ...fromResume.map((s) => s.id)] } }, orderBy: { providerSkills: { _count: "desc" } }, take: 12, select: { id: true, name: true } })
    : [];
  const hourly = services.find((s) => HOURLY.includes(s.name));
  const monthly = services.find((s) => s.name === MONTHLY);
  // CG-E004: the Enable summary — what you do (line + how), services on, products on.
  const v2 = await taxonomyV2();
  const doLines = v2 ? (await capabilitiesFor(p.id)).map((c) => c.line) : skills.map((x) => x.skill.name);
  const [svcOn, prodOn] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null } }, orderBy: { sort_order: "asc" }, select: { name: true, rate_cents: true, uom: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, offered: true, price_cents: { not: null } }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: { title: true, price_cents: true, pricing_type: true } }),
  ]);
  return {
    doLines,
    servicesOn: svcOn.map((x) => ({ name: x.name, rateCents: x.rate_cents!, unit: x.uom })),
    productsOn: prodOn.map((x) => ({ name: x.title, priceCents: x.price_cents!, monthly: x.pricing_type === "RECURRING" })),
    live: !!p.onboarding_completed_at,
    title: person?.title ?? "",
    skills: skills.map((s) => s.skill),
    suggestions: [...fromResume, ...fromType].slice(0, 12),
    industries: industries.map((i) => i.specialization),
    allIndustries,
    hourlyCents: hourly?.rate_cents ?? null,
    monthly: monthly ? { priceCents: monthly.rate_cents, hours: monthly.hours_included } : null,
    packages: products.map((x) => ({ id: x.id, name: x.title, included: x.summary ?? "", priceCents: x.price_cents, perMonth: x.pricing_type === "RECURRING", readyDays: x.lead_time_days, status: x.status })),
  };
}

/** Full-list skill search for "+ Add a skill". */
export async function searchSkills(q: string) {
  const t = q.trim();
  if (t.length < 2) return [];
  return prisma.skill.findMany({ where: { status: "ACTIVE", merged_into_id: null, visible_to_members: true, OR: [{ name: { contains: t, mode: "insensitive" } }, { aliases: { has: t } }] }, orderBy: { providerSkills: { _count: "desc" } }, take: 15, select: { id: true, name: true } });
}

/** Stop 1. Title, the skills set (removed ones go), the industries set; a profile with no role gets the role most of its skills belong to. */
export async function saveWhatYouDo(viewer: Viewer, input: { title: string; skillIds: string[]; industryIds: string[] }) {
  const p = await me(viewer);
  const title = input.title.trim();
  if (!title) throw new CwsError("Add your title");
  if (title.length > HEADLINE_MAX) throw new CwsError(`Keep your title to ${HEADLINE_MAX} characters`);
  if (!input.skillIds.length) throw new CwsError("Keep at least one skill");
  const skills = await prisma.skill.findMany({ where: { id: { in: input.skillIds } }, select: { id: true, role_id: true } });
  await prisma.person.update({ where: { id: p.person_id }, data: { title } });
  await prisma.$transaction([
    prisma.providerSkill.deleteMany({ where: { provider_profile_id: p.id, skill_id: { notIn: skills.map((s) => s.id) } } }),
    prisma.providerSkill.createMany({ data: skills.map((s) => ({ provider_profile_id: p.id, skill_id: s.id, source: "SELF_ADDED" as const, weight: SELF_ADDED_WEIGHT })), skipDuplicates: true }),
  ]);
  const industries = await prisma.specialization.findMany({ where: { id: { in: input.industryIds }, kind: "INDUSTRY" }, select: { id: true } });
  await prisma.providerProfileSpecialization.deleteMany({ where: { provider_profile_id: p.id, specialization: { kind: "INDUSTRY" }, specialization_id: { notIn: industries.map((i) => i.id) } } });
  if (industries.length) await addIndustries(p.id, industries.map((i) => i.id));
  if (!p.role_id && skills.length) {
    const count = new Map<string, number>();
    for (const s of skills) count.set(s.role_id, (count.get(s.role_id) ?? 0) + 1);
    const role = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    await prisma.providerProfile.update({ where: { id: p.id }, data: { role_id: role } });
  }
  await recomputeCompleteness(p.id);
}

/** The stock product type whose name best matches the package name (shared words); else the seller's own type from the name. */
async function typeForPackage(viewer: Viewer, personId: string, name: string): Promise<string> {
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  const want = words(name);
  let best: { id: string; score: number } | null = null;
  for (const t of await productTypes(personId)) {
    const score = [...words(t.name)].filter((w) => want.has(w)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: t.id, score };
  }
  if (best) return best.id;
  const own = await sellerTypeByName(personId, name.trim().slice(0, 60));
  if (own) return own.id;
  const { addProductType } = await import("@/lib/catalog-products");
  return (await addProductType(viewer, name)).id;
}

/** Stop 2. By the hour (Onsite + Offsite Hourly, same price) · Monthly (Monthly Retainer, price + hours) · up to 3 Fixed packages (Draft). */
export async function saveWhatYouCharge(viewer: Viewer, input: { hourlyCents: number | null; monthly: { priceCents: number; hours: number | null } | null; packages: Pkg[] }) {
  const p = await me(viewer);
  const pkgs = input.packages.filter((x) => x.name.trim()).slice(0, MAX_PACKAGES);
  if (!(input.hourlyCents && input.hourlyCents > 0) && !(input.monthly?.priceCents && input.monthly.priceCents > 0) && !pkgs.length) throw new CwsError("Add a rate or a package to continue");
  for (const n of HOURLY) {
    const t = await sellerTypeByName(p.person_id, n);
    if (t) await saveCatalogService(viewer, { serviceTypeId: t.id, on: !!input.hourlyCents && input.hourlyCents > 0, rateCents: input.hourlyCents ?? undefined, unit: "HOUR" });
  }
  const m = await sellerTypeByName(p.person_id, MONTHLY);
  if (m) await saveCatalogService(viewer, { serviceTypeId: m.id, on: !!input.monthly?.priceCents, rateCents: input.monthly?.priceCents, unit: "MONTH", hoursIncluded: input.monthly?.hours ?? null });
  // The profile's hourly rate follows (search and the profile show a rate).
  if (input.hourlyCents) await prisma.providerProfile.update({ where: { id: p.id }, data: { onsite_rate_cents: input.hourlyCents, remote_rate_cents: input.hourlyCents } });
  for (const k of pkgs) {
    if (k.priceCents == null || k.priceCents <= 0) throw new CwsError(`Give "${k.name}" a price`);
    if (!k.included.trim()) throw new CwsError(`Say what's included in "${k.name}"`);
    const serviceTypeId = await typeForPackage(viewer, p.person_id, k.name);
    await saveCatalogProduct(viewer, k.id ?? null, {
      title: k.name, serviceTypeId, summary: k.included, images: [], pricing: k.perMonth ? "MONTHLY" : "FIXED", priceCents: k.priceCents,
      delivery: "EITHER", leadTimeDays: k.readyDays, durationWeeks: null, domainIds: [], skillIds: [], deliverables: [], payPlan: k.perMonth ? "MONTHLY_ADVANCE" : "ON_DELIVERY", coverStyle: "A",
    }, false);
  }
}

/** Stop 3. Publish the rates and packages, then the profile. */
export async function enableMyCatalog(viewer: Viewer) {
  const p = await me(viewer);
  const [rates, products] = await Promise.all([
    prisma.providerService.count({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null } } }),
    prisma.serviceProduct.count({ where: { provider_profile_id: p.id, offered: true, price_cents: { not: null } } }),
  ]);
  if (!rates && !products) throw new CwsError("Turn on at least one service or one product first");
  await publishCatalog(viewer);
  // CG-E003: a row switched off stays a Draft.
  const drafts = await prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, status: "DRAFT", offered: true }, select: { id: true } });
  for (const d of drafts) await publishCatalogProduct(viewer, d.id);
  return publishProfile(viewer);
}

// ---- CG-E003: Your Service Products — a grid, one row per product, grouped by type ----------------------------
export const NAME_MAX = 40;
export const SHORT_MAX = 50;
export type ProductRow = {
  id?: string | null; serviceTypeId: string; offered: boolean; name: string; short: string; pricing: "FIXED" | "RECURRING";
  paymentEvent: "ACCEPTANCE" | "DOWNLOAD" | "INSTALLATION" | "PAYMENT_REQUEST"; offers: boolean; leadDays: number | null; priceCents: number | null; imageUrl: string | null; pdfUrl: string | null;
};

/** Groups = the stock Service Product types of the company's business type(s) + the seller's own types; rows = their products. */
export async function productGrid(viewer: Viewer) {
  const p = await me(viewer);
  const [prof, person, bts, all, rows] = await Promise.all([
    prisma.providerProfile.findUnique({ where: { id: p.id }, select: { open_to_offers: true } }),
    prisma.person.findUnique({ where: { id: p.person_id }, select: { first_name: true, last_name: true } }),
    personBusinessTypes(p.person_id),
    productTypes(p.person_id),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: { id: true, service_type_id: true, offered: true, title: true, summary: true, pricing_type: true, payment_event: true, open_to_offers: true, offers_override: true, lead_time_days: true, price_cents: true, cover_image_url: true, details_pdf_url: true, status: true } }),
  ]);
  const mine = new Set(bts.map((b) => b.name));
  const used = new Set(rows.map((r) => r.service_type_id));
  const types = all.filter((t) => t.group === "Your Types" || mine.has(t.group) || used.has(t.id)).map((t) => ({ id: t.id, name: t.name, own: t.group === "Your Types" }));
  const sellerOpen = !!prof?.open_to_offers;
  return {
    sellerName: `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim(),
    types,
    rows: rows.map((r) => ({
      id: r.id, serviceTypeId: r.service_type_id, offered: r.offered, name: r.title, short: r.summary ?? "", status: r.status,
      pricing: r.pricing_type === "RECURRING" ? ("RECURRING" as const) : ("FIXED" as const),
      paymentEvent: (["ACCEPTANCE", "DOWNLOAD", "INSTALLATION", "PAYMENT_REQUEST"].includes(r.payment_event ?? "") ? r.payment_event : "ACCEPTANCE") as ProductRow["paymentEvent"],
      offers: r.offers_override ?? (sellerOpen || r.open_to_offers), leadDays: r.lead_time_days, priceCents: r.price_cents, imageUrl: r.cover_image_url, pdfUrl: r.details_pdf_url,
    })),
  };
}

/** Save as you go: slider on + name + price → upsert the row's Draft product; slider off → kept as Draft, skipped by Enable. */
export async function saveProductRow(viewer: Viewer, r: ProductRow): Promise<string | null> {
  const p = await me(viewer);
  const owned = r.id ? await prisma.serviceProduct.findFirst({ where: { id: r.id, provider_profile_id: p.id }, select: { id: true, status: true } }) : null;
  if (r.id && !owned) throw new CwsError("That product isn't yours");
  if (!owned && !(r.offered && r.name.trim() && r.priceCents)) return null; // nothing to keep yet
  if (!(await prisma.serviceType.findFirst({ where: { id: r.serviceTypeId, kind: "SERVICE_PRODUCT" }, select: { id: true } }))) throw new CwsError("Unknown product type");
  const prof = await prisma.providerProfile.findUnique({ where: { id: p.id }, select: { open_to_offers: true } });
  const recurring = r.pricing === "RECURRING";
  const data = {
    title: r.name.trim().slice(0, NAME_MAX) || "Untitled", summary: r.short.trim().slice(0, SHORT_MAX) || null, service_type_id: r.serviceTypeId,
    pricing_type: recurring ? ("RECURRING" as const) : ("FIXED" as const), billing_period: recurring ? ("MONTHLY" as const) : null,
    // solution-types: RECURRING ⇒ DEPLOYABLE (no duration, no milestones); FIXED ⇒ DELIVERABLE.
    kind: recurring ? ("DEPLOYABLE" as const) : ("DELIVERABLE" as const), duration_weeks: recurring ? null : undefined,
    payment_event: r.paymentEvent, offers_override: r.offers === !!prof?.open_to_offers ? null : r.offers, lead_time_days: r.leadDays,
    price_cents: r.priceCents, cover_image_url: r.imageUrl, cover_style: r.imageUrl ? null : "D", details_pdf_url: r.pdfUrl, delivery: "EITHER" as const, offered: r.offered,
    ...(r.offered ? {} : { status: "DRAFT" as const }),
  };
  const milestones = recurring ? [] : [{ label: "On delivery", percent: 100, payment_event: r.paymentEvent, sequence: 0 }];
  if (!owned) {
    const row = await prisma.serviceProduct.create({ data: { ...data, duration_weeks: null, status: "DRAFT", payment_terms: "NET30", provider_profile_id: p.id, company_id: await (await import("@/lib/company-catalog")).companyIdForProfile(p.id), milestones: { create: milestones } }, select: { id: true } });
    return row.id;
  }
  await prisma.$transaction([
    prisma.serviceProductMilestone.deleteMany({ where: { service_product_id: owned.id } }),
    ...(recurring ? [prisma.serviceProductDeliverable.deleteMany({ where: { service_product_id: owned.id } })] : []),
    prisma.serviceProduct.update({ where: { id: owned.id }, data: { ...data, milestones: { create: milestones } } }),
  ]);
  return owned.id;
}
