// Lane 6 (Scott 10-15): search attributes per Business Type from scripts/data/search-attributes-2026-10-15.json (the draft
// sheet, loaded as-is), the PeopleSoft › Purchasing link fix, and Product / Business Process specializations → unconfirmed
// What I Do capabilities (Product → that product, no module; Process → that process's domains not already covered).
// Everything new carries origin GT_2026_10_14 (rollback-global-taxonomy.ts removes it). Behind taxonomy_v2 on screen.
// Dry run by default (prints counts, NOT FOUND list); --apply writes. Run: npx tsx --env-file=.env.local scripts/seed-search-attributes.ts [--apply]
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ORIGIN = "GT_2026_10_14";
type A = { commodity: string; businessType: string; name: string; list: string | null; choices: string[]; multi: boolean };
const DATA = JSON.parse(readFileSync("scripts/data/search-attributes-2026-10-15.json", "utf8")) as { attributes: A[] };
// Product specialization → Systems product (vendor › product). Unlisted products are noted, not converted.
const PRODUCT: Record<string, [string, string]> = {
  "Oracle Fusion Cloud": ["Oracle", "Fusion Cloud"], "Oracle Cloud": ["Oracle", "Fusion Cloud"], "Oracle Fusion HCM, Oracle Recruiting Cloud": ["Oracle", "Fusion Cloud"], "AI Agent Studio": ["Oracle", "Fusion Cloud"],
  "Oracle E-Business Suite": ["Oracle", "E-Business Suite"], PeopleSoft: ["Oracle", "PeopleSoft"], "JD Edwards": ["Oracle", "JD Edwards EnterpriseOne"],
  Salesforce: ["Salesforce", "Salesforce Platform"], SAP: ["SAP", "S/4HANA"], Ariba: ["SAP", "Ariba"], Coupa: ["Coupa", "Coupa Platform"], Workday: ["Workday", "Workday Enterprise"],
  "Cross-Vendor (Platform-Neutral)": ["Cross-Vendor", "Platform-Neutral"],
};

async function main() {
  const notFound: string[] = [];
  // 1 · attributes
  const bts = await prisma.businessType.findMany({ select: { id: true, name: true } });
  const existing = await prisma.businessTypeAttribute.findMany({ select: { business_type_id: true, name: true } });
  const toCreate: { business_type_id: string; name: string; choices: string[]; list: string | null; multi: boolean; sort_order: number; origin: string }[] = [];
  const order = new Map<string, number>();
  for (const a of DATA.attributes) {
    const bt = bts.find((b) => b.name === a.businessType);
    if (!bt) { notFound.push(`business type: ${a.businessType}`); continue; }
    const n = (order.get(bt.id) ?? 0) + 1;
    order.set(bt.id, n);
    if (existing.some((e) => e.business_type_id === bt.id && e.name === a.name)) continue;
    toCreate.push({ business_type_id: bt.id, name: a.name, choices: a.choices, list: a.list, multi: a.multi, sort_order: n, origin: ORIGIN });
  }

  // 2 · link fix: Oracle › PeopleSoft › Purchasing → Procure-to-Pay › Purchase Order Management
  const pur = await prisma.systemItem.findFirst({ where: { name: "Purchasing", product: { name: "PeopleSoft", vendor: { name: "Oracle" } } }, select: { id: true, domain_id: true } });
  const pom = await prisma.domain.findFirst({ where: { process: "Procure-to-Pay", name: "Purchase Order Management" }, select: { id: true } });
  if (!pur) notFound.push("system item: Oracle › PeopleSoft › Purchasing");
  if (!pom) notFound.push("domain: Procure-to-Pay › Purchase Order Management");
  const linkFix = pur && pom && pur.domain_id !== pom.id;

  // 3 · Product / Business Process specializations → unconfirmed capabilities
  const specs = await prisma.providerProfileSpecialization.findMany({ where: { specialization: { kind: { in: ["PRODUCT", "METHODOLOGY"] } } }, select: { provider_profile_id: true, specialization: { select: { name: true, kind: true } } } });
  const products = await prisma.systemProduct.findMany({ select: { id: true, name: true, vendor: { select: { name: true } } } });
  const domains = await prisma.domain.findMany({ select: { id: true, process: true } });
  const have = await prisma.providerCapability.findMany({ select: { provider_profile_id: true, domain_id: true, system_product_id: true, system_item_id: true, systemItem: { select: { product_id: true } } } });
  const caps: { provider_profile_id: string; domain_id: string | null; system_product_id: string | null; mode: "IMPLEMENT"; source: "LEGACY"; origin: string }[] = [];
  const unmapped = new Set<string>();
  for (const s of specs) {
    const mine = have.filter((h) => h.provider_profile_id === s.provider_profile_id);
    if (s.specialization.kind === "PRODUCT") {
      const m = PRODUCT[s.specialization.name];
      const prod = m && products.find((p) => p.vendor.name === m[0] && p.name === m[1]);
      if (!prod) { unmapped.add(`product: ${s.specialization.name}`); continue; }
      if (mine.some((h) => h.system_product_id === prod.id || h.systemItem?.product_id === prod.id) || caps.some((c) => c.provider_profile_id === s.provider_profile_id && c.system_product_id === prod.id)) continue;
      caps.push({ provider_profile_id: s.provider_profile_id, domain_id: null, system_product_id: prod.id, mode: "IMPLEMENT", source: "LEGACY", origin: ORIGIN });
    } else {
      const inProcess = domains.filter((d) => d.process === s.specialization.name);
      if (!inProcess.length) { unmapped.add(`process: ${s.specialization.name}`); continue; }
      for (const d of inProcess) {
        if (mine.some((h) => h.domain_id === d.id) || caps.some((c) => c.provider_profile_id === s.provider_profile_id && c.domain_id === d.id)) continue;
        caps.push({ provider_profile_id: s.provider_profile_id, domain_id: d.id, system_product_id: null, mode: "IMPLEMENT", source: "LEGACY", origin: ORIGIN });
      }
    }
  }

  console.log(JSON.stringify({ applied: APPLY, attributes: toCreate.length, linkFix: !!linkFix, specializationRows: specs.length, capabilities: caps.length, providers: new Set(caps.map((c) => c.provider_profile_id)).size, notConverted: [...unmapped], NOT_FOUND: notFound }, null, 1));
  if (notFound.length) { console.log("NOT FOUND — nothing applied"); process.exitCode = 2; return; }
  if (!APPLY) return;
  await prisma.businessTypeAttribute.createMany({ data: toCreate, skipDuplicates: true });
  if (linkFix) await prisma.systemItem.update({ where: { id: pur!.id }, data: { domain_id: pom!.id } });
  for (let i = 0; i < caps.length; i += 500) await prisma.providerCapability.createMany({ data: caps.slice(i, i + 500) });
  console.log("applied");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
