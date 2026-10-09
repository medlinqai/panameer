// L-E046: seed the admin-set "Recommended next" links (idempotent; re-runs add nothing new).
// Usage: npx tsx --env-file=.env.local scripts/seed-learning-path-next.ts [--apply]
import { prisma } from "@/lib/prisma";

const LINKS: [string, string[]][] = [
  ["oracle-cloud-foundations", ["end-user-procurement-basic-procurement", "end-user-accounting-basic-payables", "end-user-core-hr-core-hr", "end-user-supply-chain-execution-inventory-management"]],
  ["end-user-procurement-basic-procurement", ["end-user-procurement-advanced-procurement", "end-user-procurement-contract-management", "end-user-procurement-supplier-integration"]],
  ["end-user-accounting-basic-payables", ["end-user-finance-accounting-journals"]],
];

(async () => {
  const apply = process.argv.includes("--apply");
  const slugs = [...new Set(LINKS.flatMap(([f, t]) => [f, ...t]))];
  const paths = new Map((await prisma.learningPath.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })).map((p) => [p.slug, p.id]));
  for (const [from, tos] of LINKS) {
    const fromId = paths.get(from);
    if (!fromId) { console.log(`skip — no path ${from}`); continue; }
    for (const [i, to] of tos.entries()) {
      const toId = paths.get(to);
      if (!toId) { console.log(`skip — no path ${to}`); continue; }
      const exists = await prisma.learningPathNext.findUnique({ where: { from_path_id_to_path_id: { from_path_id: fromId, to_path_id: toId } } });
      console.log(`${exists ? "have" : apply ? "add " : "would"} ${from} → ${to}`);
      if (apply && !exists) await prisma.learningPathNext.create({ data: { from_path_id: fromId, to_path_id: toId, sort_order: i } });
    }
  }
  await prisma.$disconnect();
})();
