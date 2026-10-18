import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CATEGORY_ICONS, type CategoryIconKey, type Day1Category } from "@/lib/shop-categories";

// CH-E003: Shop tiles, the search picker, the left filter and Hire's chips — from the Category Hierarchy (shown + ordered).
export const shopCategories = cache(async (): Promise<Day1Category[]> => {
  const rows = await prisma.commodityGroup.findMany({ where: { hidden: false, show_in_shop: true }, orderBy: { sort_order: "asc" }, select: { name: true, icon: true, tile_line: true } });
  return rows.map((r) => ({ name: r.name, icon: (CATEGORY_ICONS as readonly string[]).includes(r.icon ?? "") ? (r.icon as CategoryIconKey) : "erp", examples: r.tile_line ?? "" }));
});

export const shopCategoryNames = async () => (await shopCategories()).map((c) => c.name);
