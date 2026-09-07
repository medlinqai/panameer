import { prisma } from "@/lib/prisma";
import { plural, type TalentStat } from "@/lib/talent-stats";

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
 * ⚠⚠ THREE REAL COUNTS NOW (`P1-J4-E388`, 2026-09-07). ⚠ SUPERSEDED, QUOTED NOT
 * DELETED: *"ONE REAL COUNT, TWO STUBS. `WorkRequest` exists; `WorkOrder` and
 * `SettlementRequest` DO NOT — no model, no table. Both zeros come from
 * `unbuilt-counters.ts` … and a tripwire test fails the moment either model is
 * added."*
 * ⚠ BOTH MODELS LANDED AND THE TRIPWIRE DID FAIL, on the same run that added
 * them, naming the files to edit and the order. This is that fix.
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
  /*
    ⚠⚠ ALL THREE ARE REAL COUNTS NOW (`P1-J4-E388`). Two of them were stubs until
    `WorkOrder` and `SettlementRequest` landed in this branch, and the `E041`
    TRIPWIRE FIRED THE MOMENT THEY DID — which is exactly what it was built to
    do: *"a test that fails when the world improves is the only placeholder that
    cannot rot."* This is the fix it prescribed, in the order it prescribed.
    ⚠ And it is what Scott's LOCKED counter rule requires (2026-08-27): *"a real
    count of what is in the database, seeded rows included… Count it and print
    it."* The stubs were honest only while the tables did not exist.
  */
  const [workRequests, workOrders, settlementRequests] = await Promise.all([
    prisma.workRequest.count(),
    prisma.workOrder.count(),
    prisma.settlementRequest.count(),
  ]);

  /* ⚠ THE ORDER IS SCOTT'S: Work Requests, Work Orders, Settlement Requests. */
  return [
    {
      value: String(workRequests),
      label: plural(workRequests, "Work Request"),
    },
    {
      value: String(workOrders),
      label: plural(workOrders, "Work Order"),
    },
    {
      value: String(settlementRequests),
      label: plural(settlementRequests, "Settlement Request"),
    },
  ];
}
