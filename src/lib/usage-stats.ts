import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠ THE SIX APPLICATIONS, COUNTED (`P2-J3-E593` — the rail's comb) ─────
 *
 * ⚠ Scott, 2026-09-20: six cells, ink, `Get Paid` the only magenta one.
 * ⚠⚠ THE SIX ARE THE SIX APPLICATIONS IN THE BAND — `Connect · Learn · Work ·
 * Sell · Orders · Get Paid` — which is why each cell carries a ONE-WORD LABEL:
 * *"Six unlabelled numbers can't be read — you can't tell which application
 * owns which."*
 *
 * ── ⚠⚠⚠ EVERY FIGURE IS A REAL COUNT. NONE IS A PLACEHOLDER ──────────────
 *
 * ⚠ The Counters decision is LOCKED and says exactly this: *"a real count of
 * what is in the database, seeded rows included, or a number Scott specifies.
 * Count it and print it. No seed-reporting, no gating."*
 * ⚠⚠ SO A ZERO HERE IS A MEASUREMENT, NOT A GAP. Three of the six read zero
 * platform-wide today (measured 2026-09-20: `BidRequest` issued 0, `WorkOrder`
 * 0, `Payment` 0), and that is the true state of a marketplace whose
 * transaction spine has shipped but never been walked end to end.
 * ⚠ Scott's own ruling on the stats card: *"THE FIGURE STAYS A TRUE `$0`"*, with
 * the layout carrying the aspiration and the number carrying the truth.
 */

export type UsageStats = {
  connect: number;
  learn: number;
  work: number;
  sell: number;
  orders: number;
  /**
   * ⚠⚠⚠ `null` MEANS *"NOT MEASURABLE"*, AND IT IS NOT THE SAME AS `0`.
   * See `earnedCents` below — the distinction is the whole point of this field.
   */
  earnedCents: number | null;
};

export async function getUsageStats(
  personId: string,
  profileId: string,
  learnPaths: number,
  colleagues: number
): Promise<UsageStats> {
  const [work, sell, orders] = await Promise.all([
    /* ⚠ An invitation somebody actually received — `issued_at` rather than a
       status list, the same rule `/stats` uses so the two cannot disagree. */
    prisma.bidRequest.count({
      where: { provider_person_id: personId, issued_at: { not: null } },
    }),
    prisma.package.count({
      where: { provider_profile_id: profileId, status: "PUBLISHED" },
    }),
    prisma.workOrder.count({ where: { provider_person_id: personId } }),
  ]);

  /*
    ── ⚠⚠⚠ EARNINGS ARE NOT MODELLED, AND THIS IS THE HONEST WAY TO SAY `$0` ──

    ⚠ MEASURED 2026-09-20: there is **no provider-earnings read anywhere**, and
    `Payment` cannot supply one — it is scoped by `p_account_id` with an
    `amount_cents`, i.e. the BUYER'S money arriving, not a provider payout.
    There is no payout model at all.

    ⚠⚠ SO A TYPED `$0` WOULD BE A FABRICATED FIGURE — the `Viewing Me` mistake,
    where the mockup's `201` was a plausible number that did not exist.
    ⚠⚠⚠ BUT `$0` IS NEVERTHELESS **TRUE**, AND FOR A REASON THAT CAN BE
    COMPUTED: with zero work orders there is no mechanism by which this provider
    could have been paid. ⚠ That is the difference from `Viewing Me` — views
    could be non-zero in reality and simply are not counted; earnings **cannot**
    be non-zero while `orders` is 0.

    ⚠⚠ SO THE FIGURE IS DERIVED FROM `orders`, NOT TYPED, AND IT INVALIDATES
    ITSELF: the moment this provider has a single work order, this returns
    `null` and the card renders the dash convention instead of a number it
    cannot stand behind. **The day payouts ship, this function stops answering
    rather than starts lying**, and `check:community-page` asserts the link.
  */
  const earnedCents = orders === 0 ? 0 : null;

  return { connect: colleagues, learn: learnPaths, work, sell, orders, earnedCents };
}
