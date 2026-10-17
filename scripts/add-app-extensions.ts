// Scott 10-17: "App Extensions" product type (Panameer itself is an extension to procurement applications).
// Adds ONLY these two stock types; the full taxonomy seed is not re-run. Dry run by default.
// Run: npx tsx --env-file=.env.local scripts/add-app-extensions.ts [--apply]
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");
const ADD = [
  { bt: "ERP Related", cat: "Run", name: "App Extensions", besides: "AI Agents", description: "A ready-made app that extends a procurement application" },
  { bt: "Software & SaaS", cat: "Subscriptions", name: "App Extension", description: "A ready-made app that extends a business application" },
];

async function main() {
  for (const a of ADD) {
    let cat = await prisma.serviceCategory.findFirst({ where: { name: a.cat, businessType: { name: a.bt } }, select: { id: true, name: true, _count: { select: { serviceTypes: true } } } });
    // Scott's DB has no "ERP Related › Run": put it in whatever category holds the sibling type (AI Agents).
    if (!cat && "besides" in a && a.besides) {
      const sib = await prisma.serviceType.findFirst({ where: { name: a.besides, merged_into_id: null, service_category_id: { not: null } }, select: { service_category_id: true } });
      if (sib?.service_category_id) cat = await prisma.serviceCategory.findUnique({ where: { id: sib.service_category_id }, select: { id: true, name: true, _count: { select: { serviceTypes: true } } } });
    }
    if (!cat) {
      const cats = await prisma.serviceCategory.findMany({ where: { businessType: { name: a.bt } }, select: { name: true } });
      console.log(`MISSING category ${a.bt} › ${a.cat} — skipped. ${a.bt} has: ${cats.map((c) => c.name).join(", ") || "no categories"}`);
      continue;
    }
    console.log(`  (into category "${cat.name}")`);
    const hit = await prisma.serviceType.findFirst({ where: { service_category_id: cat.id, name: a.name } });
    console.log(`${hit ? "exists" : APPLY ? "create" : "would create"}: ${a.bt} › ${a.cat} › ${a.name} (RECURRING · MONTH)`);
    if (hit || !APPLY) continue;
    await prisma.serviceType.create({ data: { name: a.name, description: a.description, service_category_id: cat.id, kind: "SERVICE_PRODUCT", pricing_model: "RECURRING", units: ["MONTH"], status: "STOCK", is_baseline: true, reviewed_at: new Date(), sort_order: cat._count.serviceTypes + 1 } });
  }
  if (!APPLY) console.log("Dry run. Add --apply to write.");
}
main().finally(() => prisma.$disconnect());
