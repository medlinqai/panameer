// CH-E003: copy the Day-1 tiles (icon + line) onto the Categories so Shop and Hire read them from the hierarchy.
// Usage: npx tsx --env-file=.env.local scripts/seed-category-tiles.ts [--apply]
import { prisma } from "@/lib/prisma";
import { DAY1_CATEGORIES } from "@/lib/shop-categories";

(async () => {
  const apply = process.argv.includes("--apply");
  for (const c of DAY1_CATEGORIES.filter((x) => !x.href)) {
    const g = await prisma.commodityGroup.findUnique({ where: { name: c.name }, select: { id: true, icon: true, tile_line: true } });
    if (!g) { console.log(`! ${c.name} missing`); continue; }
    if (g.icon === c.icon && g.tile_line === c.examples) continue;
    console.log(`~ ${c.name}: icon ${c.icon} · "${c.examples}"`);
    if (apply) await prisma.commodityGroup.update({ where: { id: g.id }, data: { icon: c.icon, tile_line: c.examples, show_in_shop: true } });
  }
  console.log(apply ? "Applied." : "Dry run — add --apply.");
  await prisma.$disconnect();
})();
