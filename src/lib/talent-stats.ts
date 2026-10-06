import { prisma } from "@/lib/prisma";
import { getCatalogCounts } from "@/lib/learn-catalog-counts";

export type TalentStat = {
  value: string;
  label: string;
};

export function plural(n: number, singular: string): string {
  return n === 1 ? singular : `${singular}s`;
}

export async function talentHeroStats(): Promise<TalentStat[]> {
  // TWO QUERIES, IN PARALLEL, AND NEITHER IS FILTERED BY A VIEWER. These are
  const [providers, products] = await Promise.all([
    prisma.providerProfile.count(),
    // THE PREDICATE IS `status: "PUBLISHED"` ON `packages.status`
    prisma.serviceProduct.count({ where: { status: "PUBLISHED" } }),
  ]);

  // BY `key`, NOT BY LABEL — the label pluralises off the number, so a
  const lessons = (await getCatalogCounts()).find((c) => c.key === "lessons");

  // THE ORDER IS THE BRIEF'S TABLE ORDER — Lessons, Providers, Service Products.
  return [
    // IF `CATALOG_COUNTS` IS EVER RESHAPED THIS TILE DISAPPEARS rather than
    ...(lessons ? [{ value: lessons.value, label: lessons.label }] : []),
    { value: String(providers), label: plural(providers, "Provider") },
    { value: String(products), label: plural(products, "Service Product") },
  ];
}
