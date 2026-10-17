import { prisma } from "@/lib/prisma";
import { ownedProviderProfile, type Viewer } from "@/lib/access";
import { personBusinessTypes } from "@/lib/business-types";
import { publishCatalog, ensureDefaultRates } from "@/lib/build-catalog";
import { publishCatalogProduct, productTypes } from "@/lib/catalog-products";
import { publishProfile } from "@/lib/onboarding";
import { missingBeforeEnable } from "@/lib/visibility";

// CWS-E002–E005: Create What You Sell, slimmed — What You Do · What You Charge · Enable My Catalog. Owner-scoped from the session.
export class CwsError extends Error {}

async function me(viewer: Viewer) {
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true, role_id: true, onboarding_completed_at: true } });
  if (!p) throw new CwsError("No seller profile");
  return p;
}

/** RF-E006: what the Enable stop shows — services on and products on. */
export async function createState(viewer: Viewer) {
  const p = await me(viewer);
  await ensureDefaultRates(viewer).catch(() => null);
  const [svcOn, prodOn, missing] = await Promise.all([
    prisma.providerService.findMany({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null } }, orderBy: { sort_order: "asc" }, select: { name: true, rate_cents: true, uom: true } }),
    prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, offered: true, price_cents: { not: null } }, orderBy: [{ sort_order: "asc" }, { created_at: "asc" }], select: { title: true, price_cents: true, pricing_type: true } }),
    missingBeforeEnable(p.id),
  ]);
  return {
    live: !!p.onboarding_completed_at,
    servicesOn: svcOn.map((x) => ({ name: x.name, rateCents: x.rate_cents!, unit: x.uom })),
    productsOn: prodOn.map((x) => ({ name: x.title, priceCents: x.price_cents!, monthly: x.pricing_type === "RECURRING" })),
    missing,
  };
}

/** Stop 3. Publish the rates and packages, then the profile. */
export async function enableMyCatalog(viewer: Viewer) {
  const p = await me(viewer);
  const [rates, products] = await Promise.all([
    prisma.providerService.count({ where: { provider_profile_id: p.id, active: true, rate_cents: { not: null } } }),
    prisma.serviceProduct.count({ where: { provider_profile_id: p.id, offered: true, price_cents: { not: null } } }),
  ]);
  if (!rates && !products) throw new CwsError("Turn on at least one service or one product first");
  // VR-E003: Enable can't leave you hidden — the same rule as the bar (the offer is what Enable publishes now).
  const missing = await missingBeforeEnable(p.id);
  if (missing.length) throw new CwsError(`Before you enable, add: ${missing.map((m) => m.label).join(" · ")}`);
  await publishCatalog(viewer);
  // CG-E003: a row switched off stays a Draft.
  const drafts = await prisma.serviceProduct.findMany({ where: { provider_profile_id: p.id, status: "DRAFT", offered: true }, select: { id: true } });
  for (const d of drafts) await publishCatalogProduct(viewer, d.id);
  return publishProfile(viewer);
}

// ---- CG-E003: Your Service Products — a grid, one row per product, grouped by type ----------------------------
export const NAME_MAX = 40;
export const SHORT_MAX = 120;
export type ProductRow = {
  id?: string | null; serviceTypeId: string; offered: boolean; name: string; short: string; pricing: "FIXED" | "RECURRING";
  paymentEvent: "ACCEPTANCE" | "DOWNLOAD" | "INSTALLATION" | "PAYMENT_REQUEST"; offers: boolean; leadDays: number | null; priceCents: number | null; imageUrl: string | null; pdfUrl: string | null;
};

/** Scott 10-17: Remove from the grid. Deleted when nothing points at it; otherwise taken off (Draft, slider off). */
export async function removeProductRow(viewer: Viewer, id: string): Promise<"deleted" | "hidden" | "gone"> {
  const p = await me(viewer);
  const sp = await prisma.serviceProduct.findFirst({ where: { id, provider_profile_id: p.id }, select: { id: true } });
  if (!sp) return "gone";
  try {
    await prisma.serviceProduct.delete({ where: { id } });
    return "deleted";
  } catch {
    await prisma.serviceProduct.update({ where: { id }, data: { offered: false, status: "DRAFT" } });
    return "hidden";
  }
}

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
