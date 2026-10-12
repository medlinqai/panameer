// TX-E001..E006 dev walk on a throwaway taxonomy (the real one is seeded by Scott): provider with two business types →
// Build Your Catalog → Remote rate → publish → Shop type count → What We Buy → punchout lines carry the commodity code.
// Run: MAIL_CAPTURE=1 npx tsx --env-file=.env.local scripts/dev-walk-service-taxonomy.ts
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buildCatalogData, publishCatalog, saveCatalogService, suggestType } from "@/lib/build-catalog";
import { listProductTypes } from "@/lib/service-product-types";
import { offBusinessTypeIds, setWhatWeBuy } from "@/lib/what-we-buy";
import { workFilterDefs } from "@/lib/work-filters";
import { sessionFor, startSession } from "@/lib/erp/punchout";
import { addProductToCart, addToCart, cartLines } from "@/lib/erp/cart";
import { hashSecret } from "@/lib/erp/connections";
import { check, cleanup, done, made, party } from "./lib/dev-fixture";

const tag = Date.now().toString(36);
const ids = { group: "", bts: [] as string[], types: [] as string[], products: [] as string[] };

async function main() {
  const g = await prisma.commodityGroup.create({ data: { name: `TX Walk ${tag}`, unspsc_segments: ["80", "81"], sort_order: 999 } });
  ids.group = g.id;
  const erp = await prisma.businessType.create({ data: { code: `TXW_ERP_${tag}`, name: `TX ERP ${tag}`, commodity_group_id: g.id, uses_skills: true, sort_order: 998 } });
  const saas = await prisma.businessType.create({ data: { code: `TXW_SAAS_${tag}`, name: `TX SaaS ${tag}`, commodity_group_id: g.id, uses_skills: false, sort_order: 999 } });
  ids.bts.push(erp.id, saas.id);
  const consulting = await prisma.serviceCategory.create({ data: { business_type_id: erp.id, name: "Consulting", kind: "SERVICE", sort_order: 1 } });
  const build = await prisma.serviceCategory.create({ data: { business_type_id: erp.id, name: "Build", kind: "SERVICE_PRODUCT", sort_order: 2 } });
  const subs = await prisma.serviceCategory.create({ data: { business_type_id: saas.id, name: "Subscriptions", kind: "SERVICE_PRODUCT", sort_order: 1 } });
  const remote = await prisma.serviceType.create({ data: { name: `TX Remote Consulting ${tag}`, service_category_id: consulting.id, kind: "SERVICE", pricing_model: "TIME", units: ["HOUR", "DAY"], delivery: "OFFSITE", required: true, commodity_code: "80101500", is_baseline: true } });
  const reports = await prisma.serviceType.create({ data: { name: `TX Reports ${tag}`, service_category_id: build.id, kind: "SERVICE_PRODUCT", pricing_model: "FIXED", units: ["EACH"], commodity_code: "81111504", is_baseline: true } });
  const app = await prisma.serviceType.create({ data: { name: `TX App Subscription ${tag}`, service_category_id: subs.id, kind: "SERVICE_PRODUCT", pricing_model: "RECURRING", units: ["MONTH"], is_baseline: true } });
  ids.types.push(remote.id, reports.id, app.id);

  const prov = await party("PROVIDER", "Tia");
  const buyer = await party("BUYER", "Ted");
  const per = await prisma.person.findUniqueOrThrow({ where: { id: prov.personId }, select: { company_id: true } });
  await prisma.companyMembership.create({ data: { person_id: prov.personId, company_id: per.company_id!, role: "ADMIN", status: "APPROVED" } });
  await prisma.companyBusinessType.createMany({ data: [{ company_id: per.company_id!, business_type_id: erp.id }, { company_id: per.company_id!, business_type_id: saas.id }] });

  const d = await buildCatalogData(prov.viewer);
  check("provider with two business types sees both Service Catalogs", d.businessTypes.length === 2 && d.categories.some((c) => c.name === "Consulting") && d.categories.some((c) => c.name === "Subscriptions"));
  const saved = await saveCatalogService(prov.viewer, { serviceTypeId: remote.id, on: true, rateCents: 15000, unit: "HOUR" });
  const svc = await prisma.providerService.findUniqueOrThrow({ where: { id: saved!.id } });
  check("Remote rate saves a draft Service carrying the commodity code", svc.rate_cents === 15000 && svc.uom === "HOUR" && !svc.published_at && svc.unspsc_code === "80101500");
  check("Publish My Catalog publishes it", (await publishCatalog(prov.viewer)) === 1 && !!(await prisma.providerService.findUnique({ where: { id: svc.id } }))?.published_at);
  await suggestType(prov.viewer, `TX Suggested ${tag}`, "SERVICE");
  const sug = await prisma.serviceType.findFirst({ where: { name: `TX Suggested ${tag}` } });
  if (sug) ids.types.push(sug.id);
  check("Suggest a Service Type → SUGGESTED for admin review", sug?.status === "SUGGESTED");

  const prod = await prisma.serviceProduct.create({ data: { provider_profile_id: prov.profileId!, title: `TX Open PO Report ${tag}`, price_cents: 120000, status: "PUBLISHED", service_type_id: reports.id } });
  ids.products.push(prod.id);
  // Shop hides test accounts from everyone else, so check the same data the Shop reads, and the filter's type list.
  const row = await prisma.serviceProduct.findUniqueOrThrow({ where: { id: prod.id }, select: { service_type_id: true, serviceType: { select: { serviceCategory: { select: { business_type_id: true } } } } } });
  const types = await listProductTypes();
  check("Shop: product carries its Service Type + business type; the filter lists the type under its category", row.service_type_id === reports.id && row.serviceType?.serviceCategory?.business_type_id === erp.id && types.some((t) => t.id === reports.id && t.group_label === "Build"));
  const bper = await prisma.person.findUniqueOrThrow({ where: { id: buyer.personId }, select: { company_id: true } });
  await prisma.companyMembership.create({ data: { person_id: buyer.personId, company_id: bper.company_id!, role: "ADMIN", status: "APPROVED" } });
  await setWhatWeBuy(buyer.viewer, { businessTypeId: erp.id, enabled: false });
  check("What We Buy: switching a business type off hides it for that buyer", (await offBusinessTypeIds((await prisma.person.findUniqueOrThrow({ where: { id: buyer.personId }, select: { user_id: true } })).user_id!)).has(erp.id));
  await setWhatWeBuy(buyer.viewer, { commodityGroupId: g.id, enabled: false });
  const off = await offBusinessTypeIds((await prisma.person.findUniqueOrThrow({ where: { id: buyer.personId }, select: { user_id: true } })).user_id!);
  check("…and switching the group off hides all its business types", off.has(erp.id) && off.has(saas.id));

  const defs = await workFilterDefs({});
  check("Work: Business Type filter lists business types that use skills", !!defs.find((f) => f.key === "bt")?.options.some((o) => o.value === erp.id) && !defs.find((f) => f.key === "bt")?.options.some((o) => o.value === saas.id));

  const conn = await prisma.erpConnection.create({ data: { p_account_id: buyer.pAccountId, name: "TX Walk ERP", from_identity: `TXW-${tag}`, sender_identity: "TXW", shared_secret_hash: hashSecret(`s-${tag}-0123456789`), outbound_cxml_url: "https://erp.example.test/cxml", oracle_rest_base_url: "https://erp.example.test", credential_env_name: "ORACLE_DEVWALK_REST" } });
  made.connections.push(conn.id);
  const token = randomBytes(16).toString("hex");
  await prisma.punchoutSession.create({ data: { connection_id: conn.id, start_token_hash: createHash("sha256").update(token).digest("hex"), requester_person_id: buyer.personId, buyer_cookie: "bc", browser_form_post_url: "https://erp.example.test/return", expires_at: new Date(Date.now() + 3600_000) } });
  const cookie = (await startSession(token))!;
  await addToCart((await sessionFor(cookie))!, { serviceId: svc.id, quantity: 8 });
  await addProductToCart((await sessionFor(cookie))!, { productId: prod.id, quantity: 1 });
  const lines = await cartLines((await sessionFor(cookie))!);
  check("punchout lines carry the type's commodity code", lines.some((l) => l.provider_service_id === svc.id && l.unspsc_code === "80101500") && lines.some((l) => l.service_product_id === prod.id && l.unspsc_code === "81111504"));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await prisma.punchoutSession.deleteMany({ where: { connection_id: { in: made.connections } } });
    await prisma.serviceProduct.deleteMany({ where: { id: { in: ids.products } } });
    await prisma.providerService.deleteMany({ where: { service_type_id: { in: ids.types } } });
    await prisma.buySetting.deleteMany({ where: { OR: [{ business_type_id: { in: ids.bts } }, { commodity_group_id: ids.group || undefined }] } });
    await prisma.companyBusinessType.deleteMany({ where: { business_type_id: { in: ids.bts } } });
    await prisma.companyMembership.deleteMany({ where: { person_id: { in: made.persons } } });
    await prisma.requesterProfile.deleteMany({ where: { person_id: { in: made.persons } } });
    await cleanup();
    await prisma.serviceType.deleteMany({ where: { id: { in: ids.types } } });
    await prisma.serviceCategory.deleteMany({ where: { business_type_id: { in: ids.bts } } });
    await prisma.businessType.deleteMany({ where: { id: { in: ids.bts } } });
    if (ids.group) await prisma.commodityGroup.deleteMany({ where: { id: ids.group } });
    process.exitCode = done("dev-walk-service-taxonomy") || process.exitCode;
    await prisma.$disconnect();
  });
