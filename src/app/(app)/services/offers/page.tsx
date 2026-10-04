import { guardPage } from "@/lib/guard";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS, tabSequenceFor } from "@/lib/nav";
import { openOffersForSeller } from "@/lib/service-product-offers";
import { OffersInbox } from "@/components/service-products/OffersInbox";

export const metadata = { title: "Offers for My Services · Panameer" };

export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  const offers = await openOffersForSeller(viewer);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageTabs
        sequence={tabSequenceFor("/my-services")} tabs={PAGE_TABS["/my-services"]} current="/services/offers" />
      {}
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
