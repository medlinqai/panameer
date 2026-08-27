import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";
import {
  SETTLEMENT_REQUESTS_STUB,
  WORK_ORDERS_STUB,
} from "@/lib/unbuilt-counters";

/**
 * ── `/work`'s THREE HERO TILES (`P1-J1-E041`) ───────────────────────────────
 *
 * Scott, 2026-08-27: *"The card/counters on the WORK page are wrong. Let's get these
 * tracking the right transactions. Card #1 is tracking 'Lessons'. This should be
 * tracking Work Requests. Card #2 should be tracking Work Orders. Card [#3] should
 * be tracking Settlement Requests."*
 *
 * ⚠⚠ WHY THIS FILE EXISTS AT ALL, AND IT IS THE TRAP THE BRIEF NAMED: `WorkHero`
 * used to call `talentHeroStats()`, and so do `TalentHero` and `ShopHero`. THREE
 * PAGES, ONE FUNCTION — editing it to fix `/work` would silently have changed
 * `/talent` and `/shop` too. Each page now owns its own module and
 * `talentHeroStats()` serves `/talent` alone, which is what its name always claimed.
 * ⚠ `/talent` RENDERS BYTE-IDENTICAL. Proved by diffing its HTML.
 *
 * ⚠ ONE REAL COUNT, TWO STUBS. `WorkRequest` exists (`schema.prisma:2218`);
 * `WorkOrder` and `SettlementRequest` DO NOT — no model, no table. Both zeros come
 * from `unbuilt-counters.ts` so `/work` and `/shop` cannot disagree about
 * `Work Orders`, and a tripwire test fails the moment either model is added.
 *
 * ⚠ BUILD TIME, NOT PER REQUEST — the same pattern `talentHeroStats()` uses.
 * Reading a database in a server component does NOT make a route dynamic; only
 * request-time data does. ⚠ `/work` STAYS `○`, measured from the build's route table.
 * ⚠ THE DEPLOYMENT CONSEQUENCE IS UNCHANGED AND ALREADY TRUE OF THIS PAGE: the
 * database must be reachable at build time or the build fails.
 */
export async function workHeroStats(): Promise<TalentStat[]> {
  /*
    ⚠ NO FILTER, AND THAT IS SCOTT'S INSTRUCTION, 2026-08-27: *"Re the work request
    rows...just count them. Who cares if they are ALL seeded for now? We will come
    back and clean up the DB later."*
    ⚠ SO THERE IS NO SEED CAVEAT, NO FOOTNOTE AND NO PRE-LAUNCH ROW FOR THIS TILE.
    Do not add a `where` to make the number "more honest" — he was asked and answered.
  */
  const workRequests = await prisma.workRequest.count();

  /* ⚠ THE ORDER IS SCOTT'S: Work Requests, Work Orders, Settlement Requests. */
  return [
    {
      value: String(workRequests),
      label: plural(workRequests, "Work Request"),
    },
    {
      /* ⚠ STUB — see `unbuilt-counters.ts`. Becomes `prisma.workOrder.count()`. */
      value: String(WORK_ORDERS_STUB),
      label: plural(WORK_ORDERS_STUB, "Work Order"),
    },
    {
      /* ⚠ STUB — becomes `prisma.settlementRequest.count()`. */
      value: String(SETTLEMENT_REQUESTS_STUB),
      label: plural(SETTLEMENT_REQUESTS_STUB, "Settlement Request"),
    },
  ];
}
