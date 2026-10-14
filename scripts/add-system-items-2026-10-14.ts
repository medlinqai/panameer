// Adds Ariba / Coupa / SAP S/4HANA / JD Edwards modules (Scott 10-14). Additive, origin GT_2026_10_14 (rollback removes them).
// The empty "JD Edwards" vendor is hidden — JD Edwards is an Oracle product. Dry run by default; --apply to write.
// Run: npx tsx --env-file=.env.local scripts/add-system-items-2026-10-14.ts [--apply]
import { prisma } from "@/lib/prisma";
const APPLY = process.argv.includes("--apply");
const ORIGIN = "GT_2026_10_14";
const P2P = "Procure-to-Pay", R2R = "Record-to-Report", O2C = "Order-to-Cash", P2M = "Plan-to-Produce", EPM = "Enterprise Performance Mgmt (EPM)";
type I = [name: string, process: string, domain: string];
const DATA: { vendor: string; product: string; items: I[] }[] = [
  { vendor: "SAP", product: "Ariba", items: [
    ["Spend Management", P2P, "Data, Analytics & AI Governance"], ["Sourcing", P2P, "Sourcing & Supplier Selection"], ["Contracts", P2P, "Contract Management"],
    ["Buying & Invoicing", P2P, "Purchase Order Management"], ["Supplier Management", P2P, "Supplier Risk & Compliance"], ["Catalogs", P2P, "Requisitioning & Demand Management"] ] },
  { vendor: "Coupa", product: "Coupa Platform", items: [["Coupa (Platform)", P2P, "Purchase Order Management"]] },
  { vendor: "SAP", product: "S/4HANA", items: [
    ["MM — Materials Management", P2P, "Purchase Order Management"], ["FI — Finance", R2R, "Transaction Processing & Journal Entry Management"],
    ["CO — Controlling", EPM, "Profitability & Cost Management"], ["SD — Sales & Distribution", O2C, "Order & Contract Execution Management"], ["PP — Production Planning", P2M, "Manufacturing & Production Management"] ] },
  { vendor: "Oracle", product: "JD Edwards EnterpriseOne", items: [
    ["Procurement", P2P, "Purchase Order Management"], ["Financials", R2R, "Transaction Processing & Journal Entry Management"],
    ["Distribution", P2M, "Order Fulfillment & Distribution"], ["Manufacturing", P2M, "Manufacturing & Production Management"] ] },
];
async function main() {
  const out: string[] = [];
  for (const g of DATA) {
    let v = await prisma.systemVendor.findFirst({ where: { name: g.vendor } });
    if (!v && APPLY) v = await prisma.systemVendor.create({ data: { name: g.vendor, origin: ORIGIN } });
    let p = v ? await prisma.systemProduct.findFirst({ where: { vendor_id: v.id, name: g.product } }) : null;
    if (!p && v && APPLY) p = await prisma.systemProduct.create({ data: { vendor_id: v.id, name: g.product, origin: ORIGIN } });
    for (const [name, process, domain] of g.items) {
      const d = await prisma.domain.findFirst({ where: { process, name: domain }, select: { id: true } });
      const has = p ? await prisma.systemItem.findFirst({ where: { product_id: p.id, name } }) : null;
      if (!has && p && APPLY) await prisma.systemItem.create({ data: { product_id: p.id, name, kind: "MODULE", domain_id: d?.id ?? null, origin: ORIGIN } });
      out.push(`${g.vendor} › ${g.product} › ${name} → ${d ? domain : "NO DOMAIN"}${has ? " (exists)" : ""}`);
    }
  }
  const jde = await prisma.systemVendor.findFirst({ where: { name: "JD Edwards" }, include: { products: true } });
  if (jde && !jde.products.length && APPLY) await prisma.systemVendor.update({ where: { id: jde.id }, data: { hidden: true } });
  console.log(out.join("\n"));
  console.log(JSON.stringify({ applied: APPLY, items: out.length, jdEdwardsVendorHidden: !!jde && !jde.products.length }));
}
main().finally(() => prisma.$disconnect());
