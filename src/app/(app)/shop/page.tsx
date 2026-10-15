import { Suspense } from "react";
import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { listShopProducts } from "@/lib/shop";
import { prisma } from "@/lib/prisma";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { taxonomyV2 } from "@/lib/platform-settings";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShowMore } from "@/components/shop/ShowMore";
import { FilterBar, type FilterDef } from "@/components/casing/FilterBar";
import { listProductTypes } from "@/lib/service-product-types";
import { offBusinessTypeIds } from "@/lib/what-we-buy";
import { SuggestServiceType } from "@/components/shop/SuggestServiceType";
import { BILLING, byPopular, DELIVERY, filterProducts, KIND, PRICE, type ShopQuery } from "@/lib/shop-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service Products · Panameer" };

// WS-E005: Shop lands on Service Products — no hero: Popular Service Products, filters, 2-up cards, Show More, "Don't see it?".
export default async function Page({ searchParams }: { searchParams: Promise<ShopQuery> }) {
  const viewer = await memberOrPublicTwin("/shop");
  const sp = await searchParams;
  const [all, me] = await Promise.all([listShopProducts(), prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } })]);
  const cartLines = me ? await prisma.cartLine.findMany({ where: { cart: { buyer_person_id: me.id } }, select: { id: true, service_product_id: true } }) : [];
  const inCart = new Map(cartLines.map((l) => [l.service_product_id, l.id]));
  // BR-E004: buyers see everything; What We Buy only orders it — business types they buy come first.
  const off = await offBusinessTypeIds(viewer.userId);
  const first = (p: { businessTypeId?: string | null }) => (p.businessTypeId && off.has(p.businessTypeId) ? 1 : 0);
  const products = filterProducts(all, sp).sort((a, b) => first(a) - first(b) || byPopular(a, b));
  const countries = [...new Set(all.map((p) => p.providerCountry).filter((x): x is string => !!x))].sort();
  // WS-E008: Service Type first — grouped Build / Run, live counts, a pulse until this viewer opens it.
  const types = await listProductTypes();
  const typeCount = (id: string) => all.filter((p) => p.productTypeId === id).length;
  const filters: FilterDef[] = [
    {
      key: "type",
      label: "Service Type",
      pulseKey: "pm-shop-service-type-opened",
      options: types.map((t) => ({ value: t.id, label: t.name, count: typeCount(t.id), group: t.group_label ?? "Other" })),
      footer: <SuggestServiceType />,
    },
    { key: "price", label: "Price", options: PRICE.map(({ value, label }) => ({ value, label })) },
    { key: "billing", label: "Fixed / Monthly", options: BILLING },
    { key: "kind", label: "Kind", options: KIND },
    { key: "delivery", label: "Delivery Time", options: DELIVERY.map(({ value, label }) => ({ value, label })) },
    { key: "location", label: "Provider Location", options: countries.map((c) => ({ value: c, label: c })) },
  ];

  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <ShopTabs services={await taxonomyV2()} />
      <h1 className="mb-3 mt-2 text-[24px] font-bold">Popular Service Products</h1>
      <Suspense>
        <FilterBar placeholder="Search service products…" filters={filters} />
      </Suspense>
      {products.length === 0 ? (
        <p className="border-t border-line py-5 text-[14px] text-ink-2">{all.length ? "No service product matches these filters." : "No service products are published yet."}</p>
      ) : (
        <ShowMore className="grid gap-2.5 md:grid-cols-2">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} signedIn own={p.providerPersonId === me?.id} inCartLineId={inCart.get(p.id) ?? null} />
          ))}
        </ShowMore>
      )}
      <section data-dont-see-it className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-line bg-white p-5">
        <p className="text-[14.5px]"><b>Don&apos;t see it?</b> <span className="text-ink-2">Describe what you need and get estimates from providers who do this work.</span></p>
        <span className="flex flex-wrap gap-2">
          <Link href="/search" title="Find a provider, then Request an Estimate from their profile" className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover">Request an Estimate</Link>
          <Link href="/create-work" className="inline-flex min-h-11 items-center border border-ink px-5 text-[14px] font-semibold hover:bg-surface-hover">Post a Work Request</Link>
        </span>
      </section>
    </div>
  );
}
