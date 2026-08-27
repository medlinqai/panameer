import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";
import { WORK_ORDERS_STUB } from "@/lib/unbuilt-counters";

/**
 * ── `/shop`'s THREE HERO TILES (`P1-J1-E041`) ───────────────────────────────
 *
 * Scott, 2026-08-27: `/shop` = Service Providers · Service Products · Work Orders.
 *
 * ⚠ TWO REAL COUNTS, ONE STUB. `/shop` used to print `talentHeroStats()`'s tiles —
 * `Lessons · Providers · Service Products` — which is `/talent`'s set, not this
 * page's. See `work-stats.ts` for why three pages shared one function and why they
 * no longer do.
 *
 * ⚠⚠ `Work Orders` COMES FROM `unbuilt-counters.ts`, THE SAME CONSTANT `/work`
 * READS. That is deliberate: the two pages print the same claim, so they must read
 * the same number, and one edit closes both when the model lands.
 *
 * ⚠ BUILD TIME, NOT PER REQUEST. `/shop` STAYS `○`.
 */
export async function shopHeroStats(): Promise<TalentStat[]> {
  const [providers, products] = await Promise.all([
    /*
      ⚠ `Service Providers`, NOT `Providers`. Scott's label, 2026-08-27 — the page
      sells to buyers, and `Service Provider` is the term the rest of the site uses.
      ⚠ SAME QUERY `talentHeroStats()` RUNS, deliberately: both pages count the same
      thing, so they must not diverge on how.
      ⚠ IT IS A SEED COUNT (85) and `decisions-01.md` records Scott approving it on
      three pages with the number in front of him. This is one of those three.
    */
    prisma.providerProfile.count(),
    /*
      ⚠ THE SAME PREDICATE `talent-stats.ts` USES — `status: "PUBLISHED"` on
      `packages.status`. ⚠ DO NOT DROP THE FILTER: draft rows are nobody's product
      yet, and the brief is explicit that this predicate is reused, not re-decided.
    */
    prisma.package.count({ where: { status: "PUBLISHED" } }),
  ]);

  return [
    {
      value: String(providers),
      label: plural(providers, "Service Provider"),
    },
    {
      value: String(products),
      label: plural(products, "Service Product"),
    },
    {
      /* ⚠ STUB — shared with `/work`. Becomes `prisma.workOrder.count()`. */
      value: String(WORK_ORDERS_STUB),
      label: plural(WORK_ORDERS_STUB, "Work Order"),
    },
  ];
}
