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
  /*
    ⚠ TWO QUERIES, IN PARALLEL, AND NEITHER IS FILTERED BY A VIEWER. These are
    site-wide totals on a public page — there is no owner to scope to, which is
    exactly why they are safe to compute once at build time.
  */
  const [providers, products] = await Promise.all([
    prisma.providerProfile.count(),
    /*
      ⚠ THE PREDICATE IS `status: "PUBLISHED"` ON `packages.status`
      (`PackageStatus`), AND IT IS THE ONLY DEFENSIBLE ONE. `decisions-01.md`
      records that publishing a product is NOT the same as being
      dashboard-eligible, and that the curation-gate field DOES NOT EXIST — so
      "published" is the strongest true statement available. ⚠ DRAFT ROWS ARE
      EXCLUDED: there are 2 today and they are nobody's product yet.
    */
    prisma.serviceProduct.count({ where: { status: "PUBLISHED" } }),
  ]);

  /* ⚠ SUPERSEDED, quoted not deleted (`E164`) — the label moved with R4:
     //   const lessons = CATALOG_COUNTS.find((c) => c.label === "Lessons"); */
  /* ⚠⚠ BY `key`, NOT BY LABEL — the label pluralises off the number, so a
     label lookup silently drops the tile at n === 1. */
  const lessons = (await getCatalogCounts()).find((c) => c.key === "lessons");

  /*
    ⚠ THE ORDER IS THE BRIEF'S TABLE ORDER — Lessons, Providers, Service Products.
    An earlier cut put `Lessons` last so the two live reads sat together; that was
    CC's preference, not an instruction, and it is not worth diverging for.
  */
  return [
    /*
      ⚠ IF `CATALOG_COUNTS` IS EVER RESHAPED THIS TILE DISAPPEARS rather than
      printing a wrong number — the label is the module's own, never retyped here.
    */
    ...(lessons ? [{ value: lessons.value, label: lessons.label }] : []),
    { value: String(providers), label: plural(providers, "Provider") },
    { value: String(products), label: plural(products, "Service Product") },
  ];
}
