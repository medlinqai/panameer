import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";

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
 * ⚠⚠ `Work Orders` IS A REAL COUNT (`P1-J4-E388`). ⚠ SUPERSEDED, quoted: it
 * *"COMES FROM `unbuilt-counters.ts`, THE SAME CONSTANT `/work` READS … one edit
 * closes both when the model lands."* The model landed; both pages now run the
 * same query instead of reading the same constant, so they still cannot disagree.
 *
 * ⚠ BUILD TIME, NOT PER REQUEST. `/shop` STAYS `○`.
 */
export async function shopHeroStats(): Promise<TalentStat[]> {
  const [providers, products, workOrders] = await Promise.all([
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
    /* ⚠ A REAL COUNT NOW (`P1-J4-E388`). It was `WORK_ORDERS_STUB` until
       `WorkOrder` landed, and the `E041` tripwire fired the moment it did. */
    prisma.workOrder.count(),
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
      /* ⚠ A REAL COUNT NOW (`P1-J4-E388`) — see `work-stats.ts`. */
      value: String(workOrders),
      label: plural(workOrders, "Work Order"),
    },
  ];
}
