import Link from "next/link";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { listShopProducts } from "@/lib/shop";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShowMore } from "@/components/shop/ShowMore";
import { StoreFilters } from "@/components/shop/StoreFilters";
import { SellOnPanameer } from "@/components/shop/SellMenu";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { HELP_TILE } from "@/lib/shop-categories";
import { shopCategories } from "@/lib/shop-category-list";
import { byPopular, filterStore, filterStoreExceptCategory, type StoreQuery } from "@/lib/shop-filters";
import { HELP_TYPES, searchHelpLinks } from "@/lib/help-links";
import { HelpTypeIcon } from "@/components/help/HelpTypeIcon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop · Panameer" };

// SH2-E003: Shop is one page — search with the Category picker, 12 white Category tiles; a search or a tile shows
// results here with filters on the left. Products only; services are hired under Hire.
export default async function Page({ searchParams }: { searchParams: Promise<StoreQuery> }) {
  const viewer = await memberOrPublicTwin("/shop");
  const f = await searchParams;
  const browsing = !!(f.q?.trim() || f.category || f.price || f.billing || f.delivery || f.offers);
  const [all, me] = await Promise.all([
    listShopProducts(undefined, await seesTestAccounts(viewer)),
    prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }),
  ]);
  const cartLines = me && browsing ? await prisma.workRequestLine.findMany({ where: { workRequest: { buyer_person_id: me.id, source: "SHOP", status: "INCOMPLETE" } }, select: { id: true, service_product_id: true } }) : [];
  const inCart = new Map(cartLines.map((l) => [l.service_product_id, l.id]));
  const products = browsing ? filterStore(all, f).sort(byPopular) : [];
  const forCounts = filterStoreExceptCategory(all, f);
  // II-E002: Informational Items a search finds — after the products, never in Category counts, hidden under a Category filter.
  const info = browsing && f.q?.trim() && !f.category ? await searchHelpLinks(f.q) : [];
  const tiles = await shopCategories();
  const names = tiles.map((t) => t.name);
  const categories = names.map((c) => ({ value: c, label: c, count: forCounts.filter((p) => p.category === c).length }));

  return (
    <div className="pm-white-page mx-auto w-full max-w-6xl">
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-extrabold">Shop</h1>
        <SellOnPanameer />
      </div>
      <form action="/shop" className="mt-3 flex flex-wrap sm:flex-nowrap" role="search" data-shop-search>
        <input name="q" defaultValue={f.q ?? ""} placeholder="Search products — business cards, AC tune-up, Google Ads…" aria-label="Search products" className="min-w-0 flex-1 border-2 border-ink bg-white px-3.5 py-3 text-[15px] sm:border-r-0" />
        <select name="category" defaultValue={f.category ?? ""} aria-label="Category" className="border-2 border-ink bg-white px-2.5 py-3 text-[14px] sm:border-r-0">
          <option value="">All categories</option>
          {names.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" className="bg-ink px-6 py-3 text-[14px] font-bold text-surface hover:bg-ink-hover">Search</button>
      </form>
      <p className="mt-2 text-[13.5px] text-ink-2">
        Looking to hire someone for a job? <Link href="/hire" className="font-bold text-magenta-dark">Hire →</Link>
      </p>

      {!browsing ? (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3" data-category-tiles>
          {[...tiles, HELP_TILE].map((c) => (
            <Link key={c.name} href={c.href ?? `/shop?category=${encodeURIComponent(c.name)}`} data-category-tile={c.name} className="flex items-start gap-3 rounded-[10px] border border-line bg-white p-4 hover:border-magenta focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta">
              <CategoryIcon icon={c.icon} className="h-7 w-7 shrink-0 text-magenta" />
              <span className="min-w-0">
                <b className="block text-[15px]">{c.name}</b>
                <small className="block text-[12.5px] text-ink-2">{c.examples}</small>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-[14px] text-ink-2" data-results-count>
            <span>
              {products.length} product{products.length === 1 ? "" : "s"}
              {f.category ? ` in ${f.category}` : ""}
              {f.q?.trim() ? ` for “${f.q.trim()}”` : ""}
            </span>
            <Link href="/shop" className="font-semibold text-magenta-dark underline underline-offset-4">Clear</Link>
          </p>
          <div className="mt-3 grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <StoreFilters base="/shop" f={f} categories={categories} />
            <div className="min-w-0">
            {products.length === 0 ? (
              info.length ? null : <p className="text-[14px] text-ink-3">Nothing matches yet. Try another Category, or <Link href="/hire" className="font-semibold text-magenta-dark underline">post the job under Hire</Link>.</p>
            ) : (
              <ShowMore step={12} className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                {products.map((p) => <ProductCard key={p.id} p={p} tile signedIn own={p.providerPersonId === me?.id} inCartLineId={inCart.get(p.id) ?? null} />)}
              </ShowMore>
            )}
            {info.length > 0 && (
              <section className="mt-6" data-informational-items>
                <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Informational items</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                  {info.map((l) => (
                    <article key={l.id} className="flex flex-col gap-1 rounded-[10px] border border-line bg-white p-3.5" data-info-card>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-magenta-dark">
                        <HelpTypeIcon type={l.type} className="h-4 w-4" />
                        <span className="border border-magenta px-1">Info</span>
                        {HELP_TYPES.find((t) => t.value === l.type)?.label}
                      </span>
                      <h3 className="text-[15px] font-extrabold leading-snug">{l.title}</h3>
                      {l.description && <p className="line-clamp-2 text-[12.5px] text-ink-2">{l.description}</p>}
                      <Link href={`/help/view/${l.id}`} className="mt-auto inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover">Open</Link>
                    </article>
                  ))}
                </div>
              </section>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
