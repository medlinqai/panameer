import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { openOffersForSeller } from "@/lib/service-product-offers";
import { OffersInbox } from "@/components/service-products/OffersInbox";

/**
 * Offers for My Services — **the seller's room** (`P2-A6-E705`, WS-C of
 * `brief_shop_offer_flow`, rulings 94 / 94a).
 *
 * ── ⚠⚠ IT STOPPED BEING A PLACEHOLDER ──────────────────────────────────────
 *
 * ⚠ `P2-A6-E700` shipped the offer model, the constraint and the library; **the screen
 * was reported NOT BUILT rather than implied**, and `check:offers` printed that in its own
 * output. ⚠⚠ This is that screen.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   E216 — reached from its section's TAB ROW now, not a rail flyout. The route, its
 * //   title and its gate are real; only the content is pending, which is why a titled
 * //   empty state is the honest thing rather than a 404 or a fake table.
 *
 * ── ⚠⚠⚠ TWO BUTTONS, NOT THREE ─────────────────────────────────────────────
 *
 * ⚠⚠ **SCOTT:** *"either it is an accept or deny."* A deny may carry a message and an
 * optional minimum; **there is no counter control and no field for one.**
 *
 * ── ⚠⚠ RULING 95's FOUR, ANSWERED HONESTLY ─────────────────────────────────
 *
 * ⚠ **1 PAGE NAME** — the `<h1>` matches the tab label *"Offers for My Services"* word for
 * word, and the `<title>` mirrors it.
 * ⚠ **2 MOBILE VIEW** — measured at 390 **on the row** (ruling 91), not on the page.
 * ⚠⚠⚠ **3 NOTIFICATION — NOT BUILT, AND NAMED RATHER THAN INVENTED:**
 * `shop.offer_received` (to the seller, when a buyer offers) · `shop.offer_accepted` and
 * `shop.offer_denied` (to the buyer, when the seller answers).
 * ⚠⚠⚠ **4 CFG EVENT TO THE WORKLIST — NOT BUILT**, same three names; the worklist and the
 * bell are one table, two views.
 * ⚠⚠ **NOT INVENTED HERE BECAUSE THE EVENT REGISTRY IS SCOTT'S AND `E382` GOVERNS THE
 * CATEGORY DEFAULTS** — `notification-categories.ts` says it in its own words: *"names are
 * Scott's to approve"* and *"their defaults are Scott's to change."*
 * ⚠⚠⚠ **SO AN OFFER ARRIVES AND NOBODY IS TOLD. THE SELLER MUST OPEN THIS PAGE TO FIND
 * OUT — THAT IS A REAL GAP AND IT IS REPORTED, NOT IMPLIED** (`87b`; and ruling 86's whole
 * point is that an offer nobody is told about is what the notification layer is for).
 */
export const metadata = { title: "Offers for My Services · Panameer" };

export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  /*
    ⚠⚠ OWNER-SCOPED IN THE LIBRARY, NOT HERE. `openOffersForSeller` resolves the person
    from the session and returns only offers stamped with their own id — this page never
    passes an identifier in (load-bearing rule 5).
  */
  const offers = await openOffersForSeller(viewer);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs
        sequence={tabSequenceFor("/my-services")} tabs={PAGE_TABS["/my-services"]} current="/services/offers" />
      {/* ⚠ Ruling 95 check 1 — the page is NAMED, and the name matches the tab label. */}
      <h1 className="mt-4 font-display text-[28px] font-bold tracking-[-0.5px]">
        Offers for My Services
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        A buyer can offer below your list price on a published service product. Accept it
        and it goes on their cart at the offered amount; decline it and they can buy at
        list, offer again, or walk away.
      </p>
      <OffersInbox
        offers={offers.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() }))}
      />
    </div>
  );
}
