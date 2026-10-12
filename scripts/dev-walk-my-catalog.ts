// MC-E001..E009 dev walk on a throwaway taxonomy (the real one moves when Scott applies my-catalog-rates.ts):
// provider with onsite/offsite rates → My Catalog Home (1/3) → Services shows both "From Registration" → Mentoring on + rate →
// Service Product with 2 pictures + P2P → publish → Home counts. Admin: Delete only when unused.
// Run: npx tsx --env-file=.env.local scripts/dev-walk-my-catalog.ts  (dev server on :3100)
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { SELLER_PERSONA_ITEMS } from "@/lib/nav";
import { catalogServicesFor } from "@/lib/my-catalog";
import { addType, removeAt, setDefaultOn } from "@/lib/service-taxonomy-admin";
import { check, cleanup, done, made, party } from "./lib/dev-fixture";

const BASE = "http://localhost:3100";
const tag = Date.now().toString(36);
const ids = { group: "", bt: "" };
const call = (cookie: string) => async (path: string, body?: object) => {
  const r = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { cookie, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, text, json, location: r.headers.get("location") };
};
const count = (html: string, needle: string) => html.split(needle).length - 1;

async function main() {
  // Throwaway taxonomy shaped like the MC-E004 result.
  const g = await prisma.commodityGroup.create({ data: { name: `MC Walk ${tag}`, unspsc_segments: ["80"], sort_order: 999 } });
  ids.group = g.id;
  const bt = await prisma.businessType.create({ data: { code: `MCW_${tag}`, name: `MC ERP ${tag}`, commodity_group_id: g.id, sort_order: 999 } });
  ids.bt = bt.id;
  const rates = await prisma.serviceCategory.create({ data: { business_type_id: bt.id, name: "Rates", kind: "SERVICE", sort_order: 1 } });
  const build = await prisma.serviceCategory.create({ data: { business_type_id: bt.id, name: "Build", kind: "SERVICE_PRODUCT", sort_order: 2 } });
  const mk = (name: string, data: object) => prisma.serviceType.create({ data: { name: `${name} ${tag}`, status: "STOCK", is_baseline: true, ...data } });
  const onsite = await mk("Onsite Hourly", { service_category_id: rates.id, kind: "SERVICE", units: ["HOUR"], delivery: "ONSITE", default_on: true, pricing_model: "TIME", sort_order: 1 });
  await mk("Offsite Hourly", { service_category_id: rates.id, kind: "SERVICE", units: ["HOUR"], delivery: "OFFSITE", default_on: true, pricing_model: "TIME", sort_order: 2 });
  const retainer = await mk("Monthly Retainer", { service_category_id: rates.id, kind: "SERVICE", units: ["MONTH"], delivery: "EITHER", pricing_model: "RECURRING", sort_order: 3 });
  const mentoring = await mk("Mentoring", { service_category_id: rates.id, kind: "SERVICE", units: ["HOUR"], delivery: "OFFSITE", pricing_model: "TIME", sort_order: 4 });
  const report = await mk("Report", { service_category_id: build.id, kind: "SERVICE_PRODUCT", units: ["EACH"], delivery: "OFFSITE", pricing_model: "FIXED", lead_time_days: 10 });

  // A seller who clears the publish gate, with the two registration rates.
  const prov = await party("PROVIDER", "Mia");
  const per = await prisma.person.update({ where: { id: prov.personId }, data: { is_service_provider: true, title: "Oracle Financials Consultant", photo_url: "https://example.test/mia.png", phone: "+15555550100" }, select: { company_id: true, user_id: true } });
  const companyId = per.company_id!;
  await prisma.companyMembership.create({ data: { person_id: prov.personId, company_id: companyId, role: "ADMIN", status: "APPROVED" } });
  await prisma.companyBusinessType.create({ data: { company_id: companyId, business_type_id: bt.id } });
  const site = await prisma.site.create({ data: { company_id: companyId, name: "HQ", addresses: { create: { line1: "1 Walk St", city: "Austin", state: "TX", country: "United States" } } } });
  await prisma.person.update({ where: { id: prov.personId }, data: { site_id: site.id } });
  await prisma.payoutMethod.create({ data: { person_id: prov.personId, kind: "BANK_ACCOUNT", label: "Walk bank", country: "US" } });
  const role = await prisma.role.findFirstOrThrow({ select: { id: true } });
  const skills = await prisma.skill.findMany({ where: { is_custom: false }, select: { id: true }, take: 3 });
  const skill = skills[0];
  await prisma.providerProfile.update({ where: { id: prov.profileId! }, data: { role_id: role.id, onsite_rate_cents: 15000, remote_rate_cents: 12500, hourly_rate_cents: 12500, rate_min_cents: 12500, rate_max_cents: 15000, skills: { create: skills.map((x) => ({ skill_id: x.id })) } } });
  const token = await encode({ token: { sub: per.user_id!, email: prov.email, role: "MEMBER", isServiceProvider: true }, secret: process.env.NEXTAUTH_SECRET! });
  const api = call(`next-auth.session-token=${token}`);

  // MC-E001/E002: one menu entry, the tabs, the redirects.
  check("My menu: one My Catalog → /catalog for sellers", SELLER_PERSONA_ITEMS.length === 1 && SELLER_PERSONA_ITEMS[0].label === "My Catalog" && SELLER_PERSONA_ITEMS[0].href === "/catalog");
  const old = await api("/catalog/build");
  check("/catalog/build → /catalog/services", old.status >= 300 && old.status < 400 && !!old.location?.endsWith("/catalog/services"), `${old.status} ${old.location}`);
  const ms = await api("/my-services");
  check("/my-services → /catalog/products", ms.status >= 300 && ms.status < 400 && !!ms.location?.endsWith("/catalog/products"), `${ms.status} ${ms.location}`);

  // MC-E003: Home starts at 1/3 (rates set from registration).
  const home1 = await api("/catalog");
  check("Home: Your Catalog, eyebrow COMPANY · BUSINESS TYPE, tabs", home1.text.includes("Your Catalog") && home1.text.includes(`MC ERP ${tag}`.toUpperCase()) && home1.text.includes("Estimates") && home1.text.includes("Service Products"), `status ${home1.status}`);
  check("Home ring 1/3, next step Add Your First Service Product", home1.text.includes(">1/3<") && home1.text.includes("Add Your First Service Product"));

  // MC-E005: Services — both registration rates on, with the tag.
  const svc = await api("/catalog/services");
  check("Services shows both rates \"From Registration\"", count(svc.text, "data-from-registration") === 2, `found ${count(svc.text, "data-from-registration")}`);
  check("Buyers See: onsite + expenses at cost; retainer/mentoring hidden until on", svc.text.includes("$150/hr onsite + expenses at cost") && svc.text.includes("$125/hr offsite") && count(svc.text, "Hidden until on") === 2);
  check("Turn on Mentoring + rate", (await api("/api/catalog/build", { action: "service", serviceTypeId: mentoring.id, on: true, rateCents: 9000, unit: "HOUR" })).status === 200);
  const ret = await api("/api/catalog/build", { action: "service", serviceTypeId: retainer.id, on: true, rateCents: 400000, unit: "MONTH", hoursIncluded: 20 });
  check("Monthly Retainer saves hours included", ret.status === 200 && (ret.json.service as { hoursIncluded?: number })?.hoursIncluded === 20);
  await api("/api/catalog/build", { action: "service", serviceTypeId: retainer.id, on: false });

  // MC-E006: a Service Product with 2 pictures + P2P, then publish.
  const p2p = await prisma.domain.findFirstOrThrow({ where: { process: "Procure-to-Pay" }, select: { id: true } });
  const form = { title: `Walk Open PO Report ${tag}`, serviceTypeId: report.id, summary: "Open purchase orders by buyer and supplier.", images: ["https://example.test/a.png", "https://example.test/b.png"], pricing: "FIXED", priceCents: 120000, delivery: "OFFSITE", leadTimeDays: 10, durationWeeks: 2, domainIds: [p2p.id], skillIds: [skill.id], deliverables: ["BIP report", "Runbook"], payPlan: "SPLIT" };
  const missing = await api("/api/catalog/products", { action: "save", id: null, publish: true, form: { ...form, images: [] } });
  check("Publish refuses without a cover picture", missing.status === 400 && String(missing.json.error).includes("cover picture"), String(missing.json.error));
  const saved = await api("/api/catalog/products", { action: "save", id: null, publish: true, form });
  check("Service Product publishes with 2 pictures + P2P", saved.status === 200, String(saved.json.error));
  const prod = await prisma.serviceProduct.findFirst({ where: { provider_profile_id: prov.profileId! }, include: { images: { orderBy: { sort_order: "asc" } }, domains: true, milestones: true } });
  check("pictures stored in order, first = cover_image_url; delivery + lead saved", prod?.images.length === 2 && prod.cover_image_url === "https://example.test/a.png" && prod.delivery === "OFFSITE" && prod.lead_time_days === 10 && prod.domains.length === 1 && prod.milestones.length === 2 && prod.status === "PUBLISHED" && prod.company_id === companyId);
  check("Products tab lists it as Live", (await api("/catalog/products")).text.includes(`Walk Open PO Report ${tag}`));
  const pub = await api("/api/catalog/build", { action: "publish" });
  check("Publish My Rates publishes the rates", pub.status === 200 && pub.json.published === 3, JSON.stringify(pub.json));

  const home2 = await api("/catalog");
  const live = /data-rates-live[^>]*>(\d+)</.exec(home2.text)?.[1];
  const plive = /data-products-live[^>]*>(\d+)</.exec(home2.text)?.[1];
  console.log(`    Home after publish: rates live ${live} of 4 · service products live ${plive} · ring ${/data-ring[^>]*>(\d\/3)</.exec(home2.text)?.[1]}`);
  check("Home shows the live counts (3 rates, 1 product) and 3/3", live === "3" && plive === "1" && home2.text.includes(">3/3<"));
  const seen = await catalogServicesFor(prov.profileId!, false);
  check("buyers' view carries the expenses", seen.some((s) => s.name.startsWith("Onsite Hourly") && s.expenses === "AT_COST"));

  // MC-E007: Delete only when unused.
  let refused = false;
  try { await removeAt("type", onsite.id); } catch { refused = true; }
  check("Admin: a type in use can't be deleted (Hide instead)", refused);
  await addType({ categoryId: build.id }, `Walk Spare ${tag}`);
  const spare = await prisma.serviceType.findFirstOrThrow({ where: { name: `Walk Spare ${tag}` } });
  await removeAt("type", spare.id);
  check("Admin: an unused type deletes", !(await prisma.serviceType.findUnique({ where: { id: spare.id } })));
  await setDefaultOn(retainer.id, true);
  check("Admin: On by Default toggles", (await prisma.serviceType.findUniqueOrThrow({ where: { id: retainer.id } })).default_on);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    const profiles = (await prisma.providerProfile.findMany({ where: { person_id: { in: made.persons } }, select: { id: true } })).map((p) => p.id);
    await prisma.catalogSuggestion.deleteMany({ where: { provider_profile_id: { in: profiles } } });
    await cleanup();
    if (ids.bt) {
      await prisma.serviceType.deleteMany({ where: { serviceCategory: { business_type_id: ids.bt } } });
      await prisma.businessType.delete({ where: { id: ids.bt } });
    }
    if (ids.group) await prisma.commodityGroup.delete({ where: { id: ids.group } });
    const left = await Promise.all([
      prisma.serviceProduct.count({ where: { provider_profile_id: { in: profiles } } }),
      prisma.providerService.count({ where: { provider_profile_id: { in: profiles } } }),
      prisma.serviceType.count({ where: { name: { endsWith: tag } } }),
      prisma.businessType.count({ where: { code: `MCW_${tag}` } }),
      prisma.payoutMethod.count({ where: { person_id: { in: made.persons } } }),
      prisma.person.count({ where: { id: { in: made.persons } } }),
    ]);
    console.log(`    cleanup leftovers (products, services, types, business type, payout, persons): ${left.join(", ")}`);
    done("My Catalog walk");
    await prisma.$disconnect();
  });
