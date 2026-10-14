// Merge one Systems item into another (same vendor/product): capabilities move, the duplicate is hidden (not deleted).
// Run: npx tsx --env-file=.env.local scripts/merge-system-item.ts "Oracle" "Fusion Cloud" "Supplier Qualification Management" "Supplier Qualifications" [--apply]
import { prisma } from "@/lib/prisma";
const [vendor, product, from, into] = process.argv.slice(2).filter((a) => a !== "--apply");
const APPLY = process.argv.includes("--apply");
async function main() {
  const p = await prisma.systemProduct.findFirstOrThrow({ where: { name: product, vendor: { name: vendor } } });
  const [src, dst] = await Promise.all([from, into].map((n) => prisma.systemItem.findFirstOrThrow({ where: { product_id: p.id, name: n } })));
  const caps = await prisma.providerCapability.count({ where: { system_item_id: src.id } });
  if (APPLY) {
    await prisma.providerCapability.updateMany({ where: { system_item_id: src.id }, data: { system_item_id: dst.id, ...(dst.domain_id ? { domain_id: dst.domain_id } : {}) } });
    await prisma.systemItem.update({ where: { id: src.id }, data: { hidden: true } });
  }
  console.log(JSON.stringify({ applied: APPLY, from, into, capabilitiesMoved: caps }));
}
main().finally(() => prisma.$disconnect());
