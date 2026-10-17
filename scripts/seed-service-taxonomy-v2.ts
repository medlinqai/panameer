// TX2-E002: Service Taxonomy v2 from scripts/data/service-taxonomy-2026-10-14.json (Scott approved 10-14).
// 12 commodities (+2 parked), commodity-level Rates, business types with stock Service Products. Renames keep ids;
// Corporate Systems' Rates category moves to Technology (same type ids, so provider rates keep working). Nothing deleted.
// Dry run by default: writes scripts/out/service_taxonomy_v2_dryrun.csv. Scott runs it with --apply.
// Run: npx tsx --env-file=.env.local scripts/seed-service-taxonomy-v2.ts [--apply]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { PricingModel, ServiceDelivery, ServiceKind, ServiceUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
type Item = { name: string; unit: ServiceUnit; pricing: PricingModel; delivery?: ServiceDelivery };
type Bt = { code: string; name: string; was: string[]; description: string; products: Item[] };
type Commodity = { name: string; was: string[]; description: string; hidden: boolean; sort_order: number; rates: Item[]; businessTypes: Bt[] };
// Scott 10-17: --file=scripts/data/service-taxonomy-2026-10-17.json adds Printing & Signs and the test-business gaps.
const FILE = process.argv.find((a) => a.startsWith("--file="))?.slice(7) ?? "scripts/data/service-taxonomy-2026-10-14.json";
const DATA = JSON.parse(readFileSync(FILE, "utf8")) as { commodities: Commodity[] };
const SKILLS_BT = "PANAMEER_V1";
const TECH = "Technology";

const plan: { step: string; action: string; target: string; detail: string }[] = [];
const note = (step: string, action: string, target: string, detail = "") => plan.push({ step, action, target, detail });
let fake = 0;
const newId = () => `new-${++fake}`;
const isNew = (id: string) => id.startsWith("new-");

async function main() {
  const groups = await prisma.commodityGroup.findMany();
  const bts = await prisma.businessType.findMany({ include: { serviceCategories: { include: { serviceTypes: { select: { id: true, name: true } } } } } });
  const cats = await prisma.serviceCategory.findMany({ include: { serviceTypes: { select: { id: true, name: true } } } });
  const corp = bts.find((b) => b.code === SKILLS_BT);
  const counts = { groupsRenamed: 0, groupsCreated: 0, btsRenamed: 0, btsCreated: 0, ratesCategories: 0, rateTypes: 0, productCategories: 0, productTypes: 0, moved: 0 };

  for (const c of DATA.commodities) {
    // 1 · commodity (rename via `was`, keep id)
    const g = groups.find((x) => x.name === c.name) ?? groups.find((x) => c.was.includes(x.name));
    let groupId: string;
    if (g) {
      groupId = g.id;
      const data = { name: c.name, description: c.description, sort_order: c.sort_order, hidden: c.hidden };
      if (g.name !== c.name) { note("1 commodity", "rename", g.name, `→ ${c.name}`); counts.groupsRenamed++; }
      else if (g.description !== c.description || g.sort_order !== c.sort_order || g.hidden !== c.hidden) note("1 commodity", "update", c.name, "description / sort / hidden");
      if (APPLY) await prisma.commodityGroup.update({ where: { id: g.id }, data });
    } else {
      note("1 commodity", "create", c.name, `${c.hidden ? "hidden · " : ""}sort ${c.sort_order}`);
      counts.groupsCreated++;
      groupId = APPLY ? (await prisma.commodityGroup.create({ data: { name: c.name, description: c.description, sort_order: c.sort_order, hidden: c.hidden, unspsc_segments: [] } })).id : newId();
    }

    // 2 · the commodity's Rates (SERVICE, commodity-level). Technology takes Corporate Systems' Rates category whole (ids kept).
    if (c.rates.length) {
      let rates = isNew(groupId) ? undefined : cats.find((x) => x.commodity_group_id === groupId && x.name === "Rates");
      if (!rates && c.name === TECH) {
        const corpRates = corp?.serviceCategories.find((x) => x.name === "Rates" && x.kind === "SERVICE");
        if (corpRates) {
          note("2 rates", "move", `${corp!.name} › Rates`, `→ ${c.name} › Rates (same ids: ${corpRates.serviceTypes.map((t) => t.name).join(", ")})`);
          counts.moved += corpRates.serviceTypes.length;
          if (APPLY) await prisma.serviceCategory.update({ where: { id: corpRates.id }, data: { business_type_id: null, commodity_group_id: groupId, sort_order: 1, hidden: false } });
          rates = { ...corpRates, business_type_id: null, commodity_group_id: groupId };
        }
      }
      let ratesId: string;
      if (rates) ratesId = rates.id;
      else {
        note("2 rates", "create category", `${c.name} › Rates`);
        counts.ratesCategories++;
        ratesId = APPLY && !isNew(groupId) ? (await prisma.serviceCategory.create({ data: { commodity_group_id: groupId, name: "Rates", kind: "SERVICE", sort_order: 1 } })).id : newId();
      }
      const have = rates?.serviceTypes ?? [];
      for (const [i, r] of c.rates.entries()) {
        if (have.some((t) => t.name.toLowerCase() === r.name.toLowerCase())) continue;
        note("2 rates", "create rate type", `${c.name} › ${r.name}`, `${r.unit} · ${r.pricing}${r.delivery ? ` · ${r.delivery}` : ""}`);
        counts.rateTypes++;
        if (APPLY) await prisma.serviceType.create({ data: { name: r.name, kind: "SERVICE" as ServiceKind, status: "STOCK", is_baseline: true, service_category_id: ratesId, units: [r.unit], pricing_model: r.pricing, delivery: r.delivery ?? null, sort_order: i + 1 } });
      }
    }

    // 3 · business types (match code, then name / was; keep ids)
    for (const [bi, b] of c.businessTypes.entries()) {
      const x = bts.find((y) => y.code === b.code) ?? bts.find((y) => y.name === b.name || b.was.includes(y.name));
      const uses_skills = b.code === SKILLS_BT;
      let btId: string;
      if (x) {
        btId = x.id;
        if (x.name !== b.name) { note("3 business type", "rename", x.name, `→ ${b.name} (code ${x.code} unchanged)`); counts.btsRenamed++; }
        if (x.commodity_group_id !== groupId) note("3 business type", "move", b.name, `→ commodity ${c.name}`);
        if (APPLY) await prisma.businessType.update({ where: { id: x.id }, data: { name: b.name, description: b.description, commodity_group_id: isNew(groupId) ? undefined : groupId, sort_order: bi + 1, hidden: false, uses_skills } });
      } else {
        note("3 business type", "create", `${c.name} › ${b.name}`, b.code);
        counts.btsCreated++;
        btId = APPLY && !isNew(groupId) ? (await prisma.businessType.create({ data: { code: b.code, name: b.name, description: b.description, commodity_group_id: groupId, sort_order: bi + 1, uses_skills } })).id : newId();
      }

      // 4 · stock Service Products: reuse a same-named type in this business type's categories (Corporate Systems' Build); the rest go to "Stock Products".
      const own = x?.serviceCategories.flatMap((k) => k.serviceTypes) ?? [];
      const missing = b.products.filter((p) => !own.some((t) => t.name.toLowerCase() === p.name.toLowerCase()));
      if (!missing.length) { if (b.products.length) note("4 products", "keep", `${b.name}`, `all ${b.products.length} already in its categories`); continue; }
      let stock = x?.serviceCategories.find((k) => k.name === "Stock Products" && k.kind === "SERVICE_PRODUCT");
      let stockId = stock?.id;
      if (!stockId) {
        note("4 products", "create category", `${b.name} › Stock Products`);
        counts.productCategories++;
        stockId = APPLY && !isNew(btId) ? (await prisma.serviceCategory.create({ data: { business_type_id: btId, name: "Stock Products", kind: "SERVICE_PRODUCT", sort_order: 50 } })).id : newId();
      }
      for (const [pi, p] of missing.entries()) {
        note("4 products", "create product type", `${b.name} › ${p.name}`, `${p.unit} · ${p.pricing}`);
        counts.productTypes++;
        if (APPLY && !isNew(stockId)) await prisma.serviceType.create({ data: { name: p.name, kind: "SERVICE_PRODUCT", status: "STOCK", is_baseline: true, service_category_id: stockId, units: [p.unit], pricing_model: p.pricing, delivery: p.delivery ?? null, sort_order: pi + 1 } });
      }
      stock = undefined;
    }
  }

  // Not in the workbook: left as they are (nothing deleted).
  const named = new Set(DATA.commodities.flatMap((c) => c.businessTypes.flatMap((b) => [b.code])));
  for (const b of bts.filter((y) => !named.has(y.code))) note("5 untouched", "leave", `${b.name} (${b.code})`, b.commodity_group_id ? "not in the workbook" : "no commodity · not in the workbook");
  for (const g of groups.filter((y) => !DATA.commodities.some((c) => c.name === y.name || c.was.includes(y.name)))) note("5 untouched", "leave", g.name, "commodity not in the workbook");

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync("scripts/out/service_taxonomy_v2_dryrun.csv", ["step,action,target,detail", ...plan.map((r) => [r.step, r.action, r.target, r.detail].map(esc).join(","))].join("\n") + "\n");
  console.log(JSON.stringify({ applied: APPLY, rows: plan.length, ...counts, csv: "scripts/out/service_taxonomy_v2_dryrun.csv" }));
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
