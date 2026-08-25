import { prisma } from "@/lib/prisma";
import { CATALOG_COUNTS } from "@/lib/learn-catalog-counts";

/**
 * THE THREE NUMBERS `/hire-talent`'s HERO PRINTS (`P1-J1-E029`).
 *
 * Scott, 2026-08-25, answering the WS5 fork: *"these would all be counts of what
 * is in the DB."*
 *
 * ── ⚠⚠ TWO OF THESE THREE NUMBERS ARE UNCOMFORTABLE AND HE SHIPPED THEM ANYWAY
 *
 * `decisions-01.md` 2026-08-24, his own words: *"there is no real data"* except the
 * protected set, and **85 `ProviderProfile` rows are named there as seed and
 * disposable**. `NO SEED COUNT MAY EVER SHIP AS TRACTION` was the rule that came
 * out of it.
 *
 * ⚠ HE WAS SHOWN `522 / 85 / 1` IN WRITING AND ASKED FOR THEM ANYWAY. That is a
 * decision, not an oversight, and it is recorded here so nobody "corrects" it back
 * on the strength of the older rule. ⚠ `Providers` IS ON THE PRE-LAUNCH LIST as a
 * seed count on a public page. Outstanding parts gate PROMOTION, not the build.
 *
 * ── ⚠ WHY A BUILD-TIME QUERY AND NOT A MEASURED CONSTANT ────────────────────
 *
 * `learn-catalog-counts.ts` hardcodes `/learn`'s three, and its header explains
 * why: `E223` makes the signed-out `/learn` a sales page where *"a visitor never
 * sees a catalog query"*, and `check:learn` GUARD 3 forbids catalog literals under
 * `src/components/learn/`. ⚠ NEITHER CONSTRAINT APPLIES HERE — no `E223` on this
 * route and no guard on this directory — so the brief's preference for a live read
 * stands, and these numbers cannot go stale the way a dated constant does.
 *
 * ⚠ IT RUNS AT BUILD TIME, NOT PER REQUEST. Reading a database in a server
 * component does NOT make a route dynamic; only reading REQUEST-time data
 * (cookies, headers, searchParams) does. ⚠ MEASURED, NOT ASSUMED: `/hire-talent`
 * is `○` before and after — the build's route table is in the brief report.
 *
 * ⚠⚠ THE DEPLOYMENT CONSEQUENCE, STATED PLAINLY: the database must be reachable
 * AT BUILD TIME or the build fails. That is already true of nothing else on this
 * page, so it is a new requirement for `/hire-talent`. It is the honest cost of a
 * live number on a static route, and the alternative is a constant that lies
 * quietly instead of a build that fails loudly.
 *
 * ── ⚠ `Lessons` COMES FROM THE EXISTING MODULE, ON PURPOSE ──────────────────
 *
 * Not re-queried here. `CATALOG_COUNTS` is what `/learn`'s own hero prints, so the
 * two pages cannot disagree about how many lessons exist — which they would the
 * first time one was re-read and the other was not.
 */

export type TalentStat = {
  value: string;
  label: string;
};

/**
 * ⚠ PLURALS COME OFF THE NUMBER, NEVER OFF A HARDCODED LABEL. Today
 * `Service Products` is exactly ONE, and a tile reading `1` over `Service Products`
 * is simply wrong. ⚠ THE `1` CASE IS THE LIVE CASE, not a theoretical one.
 */
function plural(n: number, singular: string): string {
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
    prisma.package.count({ where: { status: "PUBLISHED" } }),
  ]);

  const lessons = CATALOG_COUNTS.find((c) => c.label === "Lessons");

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
