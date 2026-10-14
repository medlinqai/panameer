// TX2 dev walk: new seller Facilities & Property › Landscaping & Grounds sees the Facilities rates + its stock products;
// an existing Corporate Systems provider keeps the same 4 rates (now Technology's) and prices (read-only).
// Run: npx tsx --env-file=.env.local scripts/dev-walk-taxonomy-v2.ts
import { prisma } from "@/lib/prisma";
import { buildCatalogData, saveCatalogService } from "@/lib/build-catalog";
import { productTypes } from "@/lib/catalog-products";
import { listServiceTypes } from "@/lib/my-catalog";
import type { Viewer } from "@/lib/access";
import { check, cleanup, done, party } from "./lib/dev-fixture";

async function main() {
  const land = await prisma.businessType.findUniqueOrThrow({ where: { code: "LANDSCAPING_GROUNDS" }, select: { id: true, commodityGroup: { select: { name: true } } } });
  const s = await party("PROVIDER", "Lin");
  const co = (await prisma.person.update({ where: { id: s.personId }, data: { is_service_provider: true }, select: { company_id: true } })).company_id!;
  await prisma.companyMembership.create({ data: { person_id: s.personId, company_id: co, role: "ADMIN", status: "APPROVED" } });
  await prisma.companyBusinessType.create({ data: { company_id: co, business_type_id: land.id } });
  const d = await buildCatalogData(s.viewer);
  const rates = d.categories.filter((c) => c.kind === "SERVICE").flatMap((c) => c.serviceTypes.map((t) => t.name));
  console.log(`    ${land.commodityGroup?.name} › Landscaping rates: ${rates.join(", ")}`);
  check("Landscaping seller sees the Facilities rates", ["Hourly Labor", "Per Visit", "Monthly Service Contract", "Emergency Call-Out"].every((n) => rates.includes(n)) && !rates.includes("Onsite Hourly"));
  const prods = (await productTypes(s.personId)).map((t) => t.name);
  console.log(`    stock products: ${prods.join(", ")}`);
  check("…and Landscaping's stock products (Weekly Mow …)", prods.some((n) => n.startsWith("Weekly Mow")));
  check("Add a Service lists only their commodity's rates", (await listServiceTypes(s.personId)).every((t) => rates.includes(t.name)));
  const perVisit = d.categories.flatMap((c) => c.serviceTypes).find((t) => t.name === "Per Visit")!;
  check("a Facilities rate saves", !!(await saveCatalogService(s.viewer, { serviceTypeId: perVisit.id, on: true, rateCents: 9500 })));

  // Existing provider (read-only): the Corporate Systems rates keep their ids and prices.
  const u = await prisma.user.findFirst({ where: { email: { startsWith: "iamscottwalls" } }, select: { id: true } });
  if (u) {
    const viewer = { userId: u.id, role: "user", isSystemAdmin: false, isAdmin: false, isServiceBuyer: false, isServiceProvider: true, isServiceCoordinator: false, isSupport: false } as unknown as Viewer;
    const e = await buildCatalogData(viewer);
    const names = new Map(e.categories.flatMap((c) => c.serviceTypes.map((t) => [t.id, t.name] as const)));
    const priced = e.services.filter((x) => x.rate_cents != null).map((x) => `${names.get(x.service_type_id!) ?? "?"} $${x.rate_cents! / 100}${x.published_at ? " live" : ""}`);
    console.log(`    ${e.businessTypes.map((b) => b.name).join(", ")}: ${priced.join(" · ")}`);
    check("existing provider: Corporate Systems, the same 4 rates, prices intact", e.businessTypes.some((b) => b.name === "Corporate Systems") && ["Onsite Hourly", "Offsite Hourly", "Monthly Retainer", "Mentoring"].every((n) => [...names.values()].includes(n)) && e.services.every((x) => names.has(x.service_type_id!)));
  } else console.log("    (no iamscottwalls user found)");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await cleanup(); done("Taxonomy v2 walk"); await prisma.$disconnect(); });
