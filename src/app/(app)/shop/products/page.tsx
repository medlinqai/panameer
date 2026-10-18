import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { listShopProducts } from "@/lib/shop";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { prisma } from "@/lib/prisma";
import { ShopTabs } from "@/components/shop/ShopTabs";
import { taxonomyV2 } from "@/lib/platform-settings";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShowMore } from "@/components/shop/ShowMore";
import { StoreFilters } from "@/components/shop/StoreFilters";
import { listShopProviders } from "@/lib/shop-providers";
import { byPopular, filterStore, filterStoreExceptCategory, ORACLE_CATEGORY, type StoreQuery } from "@/lib/shop-filters";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products · Shop · Panameer" };

// SH-E002: Products — left filters, a grid of store cards (Buy Now · Add to Cart, or Request a Quote). Talent sellers show masked.
export default async function Page({ searchParams }: { searchParams: Promise<StoreQuery> }) {
  const viewer = await memberOrPublicTwin("/shop");
  const f = await searchParams;
  const seesTest = await seesTestAccounts(viewer);
  const [all, me] = await Promise.all([
    listShopProducts(undefined, seesTest),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }),
  ]);
  const masked = all;
  const cartLines = me ? await prisma.workRequestLine.findMany({ where: { workRequest: { buyer_person_id: me.id, source: "SHOP", status: "INCOMPLETE" } }, select: { id: true, service_product_id: true } }) : [];
  const inCart = new Map(cartLines.map((l) => [l.service_product_id, l.id]));
  const products = filterStore(masked, f).sort(byPopular);

  const forCounts = filterStoreExceptCategory(masked, f);
  const names = [...new Set(masked.map((p) => p.category).filter((c): c is string => !!c))].sort();
  const categories = names.map((c) => ({ value: c, label: c, count: forCounts.filter((p) => p.category === c).length }));
  const tech = masked.filter((p) => p.category === ORACLE_CATEGORY);
  const types = [...new Set(tech.map((p) => p.typeName).filter((t): t is string => !!t))].sort().map((t) => ({ value: t, label: t, count: tech.filter((p) => p.typeName === t).length }));
  const providerHits = f.q?.trim() ? (await listShopProviders(seesTest, { q: f.q })).length : 0;

  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <ShopTabs services={await taxonomyV2()} />
      <form action="/shop/products" className="mt-3 flex" role="search">
        {f.category && <input type="hidden" name="category" value={f.category} />}
        <input name="q" defaultValue={f.q ?? ""} placeholder="Search products…" aria-label="Search products" className="min-w-0 flex-1 border-2 border-r-0 border-ink bg-white px-3.5 py-2.5 text-[15px]" />
        <button type="submit" className="bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
      </form>
      <h1 className="mt-4 text-[24px] font-extrabold">{f.category ?? "All products"}</h1>
      <p className="text-[14px] text-ink-2">
        {products.length} product{products.length === 1 ? "" : "s"}
        {providerHits > 0 && (
          <> · <Link href={`/shop/providers?q=${encodeURIComponent(f.q ?? "")}`} className="font-semibold text-magenta-dark underline underline-offset-4">{providerHits} provider{providerHits === 1 ? "" : "s"} match</Link></>
        )}
      </p>
      <div className="mt-3 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <StoreFilters base="/shop/products" f={f} categories={categories} types={types} />
        {products.length === 0 ? (
          <p className="text-[14px] text-ink-3">{all.length ? "Nothing matches these filters." : "No products are published yet."}</p>
        ) : (
          <ShowMore className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
            {products.map((p) => <ProductCard key={p.id} p={p} tile signedIn own={p.providerPersonId === me?.id} inCartLineId={inCart.get(p.id) ?? null} />)}
          </ShowMore>
        )}
      </div>
    </div>
  );
}
