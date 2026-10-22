import Link from "next/link";
import { cookies } from "next/headers";
import { memberOrPublicTwin } from "@/lib/public-twin";
import { hideProviderIdentity, listShopProducts } from "@/lib/shop";
import { seesTestAccounts } from "@/lib/admin/test-accounts";
import { PopularCard } from "@/components/shop/PopularCard";
import { SellOnPanameer } from "@/components/shop/SellMenu";
import { CategoryIcon } from "@/components/shop/CategoryIcon";
import { HELP_TILE } from "@/lib/shop-categories";
import { shopCategories } from "@/lib/shop-category-list";
import { byPopular, filterStore, storeHref, STORE_DELIVERY, STORE_LEAD, STORE_PRICE, type StoreQuery } from "@/lib/shop-filters";
import { HELP_TYPES, searchHelpLinks } from "@/lib/help-links";
import { HelpTypeIcon } from "@/components/help/HelpTypeIcon";
import { PageTabs } from "@/components/casing/PageTabs";
import { ShopBar } from "@/components/shop/ShopBar";
import { ShopResults } from "@/components/shop/ShopResults";
import { ShopCompare } from "@/components/shop/ShopCompare";
import { ShopOffers, ShopOrders } from "@/components/shop/ShopLists";
import { CartView } from "@/components/shop/CartView";
import { cartFor } from "@/lib/cart";
import { SliceChips } from "@/components/casing/SliceChips";
import { BTN as HL_BTN, BTN_OUT as HL_BTN_OUT, HeadRow } from "@/components/hire/HireUI";
import { AppOverview } from "@/components/hire/AppOverview";
import { shopOverview } from "@/lib/app-overviews";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";
import { COMPARE_COOKIE, parseCompare, productTypesByCategory, shopCounts, shopOffers, shopOrders, shopPerson, shopSideOf } from "@/lib/shop-app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop · Panameer" };

type Q = StoreQuery & { step?: string; slice?: string };
const BUYER_TABS = ["overview", "browse", "compare", "cart", "offers", "purchases"] as const;
const SELLER_TABS = ["overview", "browse", "offers", "sales"] as const;

// SA-E001–E006: Shop as an app like Hire — SHOP | Overview · Browse · Compare · Cart · Offers · Purchases (seller: Overview · Browse ·
// My Products · Offers · Sales). Products only; sellers show as a provider number until a Work Order is Released.
export default async function Page({ searchParams }: { searchParams: Promise<Q> }) {
  const viewer = await memberOrPublicTwin("/shop");
  const f = await searchParams;
  const person = await shopPerson(viewer);
  const side = shopSideOf(person);
  const browsing = !!(f.q?.trim() || f.category || f.price || f.billing || f.delivery || f.offers || f.type || f.lead || f.rating || f.certified);
  const allowed: readonly string[] = side === "buyer" ? BUYER_TABS : SELLER_TABS;
  const tab = f.tab && allowed.includes(f.tab) ? f.tab : browsing ? "browse" : person ? "overview" : "browse";
  const counts = person ? await shopCounts(person.id, side) : null;
  const compareIds = parseCompare((await cookies()).get(COMPARE_COOKIE)?.value);

  const tabs = side === "buyer"
    ? [
        { label: "Overview", href: "/shop", badge: counts?.total },
        { label: "Browse", href: "/shop?tab=browse" },
        { label: `Compare (${compareIds.length})`, href: "/shop?tab=compare" },
        { label: `Requisition (${counts?.cart ?? 0})`, href: "/shop?tab=cart" },
        { label: "Offers", href: "/shop?tab=offers", badge: counts?.offers },
        { label: "Purchases", href: "/shop?tab=purchases", badge: counts?.purchases },
      ]
    : [
        { label: "Overview", href: "/shop", badge: counts?.total },
        { label: "Browse", href: "/shop?tab=browse" },
        { label: "My Products", href: "/catalog/products" },
        { label: "Offers", href: "/shop?tab=offers", badge: counts?.offers },
        { label: "Sales", href: "/shop?tab=sales", badge: counts?.sales },
      ];
  const current = tab === "overview" ? "/shop" : `/shop?tab=${tab}`;

  return (
    <div className="pm-white-page">
      <PageTabs wrap eyebrow="SHOP" sequence="none" tabs={tabs} current={current}>
        <span className="ml-2 hidden shrink-0 sm:block"><SellOnPanameer /></span>
      </PageTabs>
      <div className="mx-auto w-full max-w-[1010px]">
        {tab === "overview" && person && <Overview viewer={viewer} personId={person.id} side={side} counts={counts!} />}
        {tab === "browse" && <Browse viewer={viewer} f={f} browsing={browsing} compareIds={compareIds} />}
        {tab === "compare" && <CompareTab viewer={viewer} ids={compareIds} />}
        {tab === "cart" && <CartTab viewer={viewer} />}
        {tab === "offers" && person && <OffersTab viewer={viewer} personId={person.id} side={side} slice={f.slice} />}
        {(tab === "purchases" || tab === "sales") && person && <OrdersTab viewer={viewer} personId={person.id} side={side} step={f.step ?? null} slice={f.slice} />}
      </div>
    </div>
  );
}

type Viewer = Awaited<ReturnType<typeof memberOrPublicTwin>>;

// SE-E001/E002: Shop Overview = the Hire Overview — grouped "needs you" rows with paired actions, thin band, two columns.
async function Overview({ viewer, personId, side }: { viewer: Viewer; personId: string; side: "buyer" | "seller"; counts?: unknown }) {
  const o = await shopOverview(viewer, personId, side);
  const intro = (
    <div className="mt-4 flex flex-wrap gap-2.5">{side === "buyer" ? <><Link href="/shop?tab=browse" className={HL_BTN}>Browse Products</Link><Link href="/shop?tab=purchases" className={HL_BTN_OUT}>My Purchases</Link></> : <><Link href="/catalog/products" className={HL_BTN}>Add a Product</Link><Link href="/shop?tab=sales" className={HL_BTN_OUT}>My Sales</Link></>}</div>
  );
  const lower = side === "buyer" ? <BuyerLower viewer={viewer} personId={personId} /> : <SellerLower viewer={viewer} personId={personId} />;
  return <div className="pt-6"><AppOverview count={o.count} summary={o.summary} groups={o.groups} band={o.band} lower={lower} intro={intro} /></div>;
}

async function BuyerLower({ viewer, personId }: { viewer: Viewer; personId: string }) {
  const [all, bought] = await Promise.all([
    listShopProducts(undefined, await seesTestAccounts(viewer)).then((l) => hideProviderIdentity(l, viewer)),
    shopOrders(viewer, personId, "buyer"),
  ]);
  const mine = new Set(bought.map((o) => o.product));
  const cats = new Set(all.filter((p) => mine.has(p.title)).map((p) => p.category));
  const popular = (cats.size ? all.filter((p) => cats.has(p.category)) : all).sort(byPopular).slice(0, 6);
  return (
    <div className="grid md:grid-cols-2">
      <section className="min-w-0 py-2 md:pr-7">
        <HeadRow title="Recent Purchases" />
        <ShopOrders rows={bought.slice(0, 5)} empty="No purchases yet." />
      </section>
      <section className="min-w-0 py-2 md:pl-7">
        <HeadRow title={`Popular${cats.size ? " in your categories" : ""}`} />
        <div className="mt-3 grid grid-cols-2 gap-3">{popular.map((p) => <PopularCard key={p.id} p={p} />)}</div>
      </section>
    </div>
  );
}

async function SellerLower({ viewer, personId }: { viewer: Viewer; personId: string }) {
  const [offers, sales] = await Promise.all([shopOffers(viewer, personId, "seller"), shopOrders(viewer, personId, "seller")]);
  return (
    <div className="grid md:grid-cols-2">
      <section className="min-w-0 py-2 md:pr-7">
        <HeadRow title="Offers Waiting" />
        <ShopOffers rows={offers.filter((o) => o.needsAction).slice(0, 5)} side="seller" />
      </section>
      <section className="min-w-0 py-2 md:pl-7">
        <HeadRow title="Recent Sales" />
        <ShopOrders rows={sales.slice(0, 5)} empty="No sales yet." />
      </section>
    </div>
  );
}

async function Browse({ viewer, f, browsing, compareIds }: { viewer: Viewer; f: Q; browsing: boolean; compareIds: string[] }) {
  const [all, tiles, types] = await Promise.all([
    listShopProducts(undefined, await seesTestAccounts(viewer)).then((l) => hideProviderIdentity(l, viewer)),
    shopCategories(),
    productTypesByCategory(),
  ]);
  const names = tiles.map((t) => t.name);
  const products = browsing ? filterStore(all, f).sort(byPopular) : [];
  const info = browsing && f.q?.trim() && !f.category ? await searchHelpLinks(f.q) : [];
  const inCategory = f.category ? all.filter((p) => p.category === f.category) : all;
  const hasPlace = inCategory.some((p) => p.delivery === "ONSITE") && inCategory.some((p) => p.delivery !== "ONSITE");
  const base: StoreQuery = { ...f, tab: "browse" };
  const chip = (key: keyof StoreQuery, value: string, label: string) => (
    <Link key={`${key}${value}`} href={storeHref("/shop", base, key, value)} aria-current={f[key] === value ? "true" : undefined}
      className={f[key] === value ? "shrink-0 rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "shrink-0 rounded-full border border-line px-3 py-1 font-semibold hover:border-magenta"}>{label}</Link>
  );
  const compare = all.filter((p) => compareIds.includes(p.id)).map((p) => ({ id: p.id, productTypeId: p.productTypeId }));
  return (
    <section className="py-2" data-shop-browse>
      <ShopBar q={f.q ?? ""} category={f.category ?? ""} type={f.type ?? ""} categories={names} types={types} />
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-2"><span>Looking to hire someone for a job? <Link href="/hire" className="font-bold text-magenta-dark">Hire →</Link></span><span>Need something custom? <Link href="/estimate/new" className="font-bold text-magenta-dark" data-shop-estimates-button>Request an Estimate →</Link></span></p>
      {!browsing ? (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3" data-category-tiles>
          {[...tiles, HELP_TILE].map((c) => (
            <Link key={c.name} href={c.href ?? `/shop?tab=browse&category=${encodeURIComponent(c.name)}`} data-category-tile={c.name} className="flex items-start gap-3 rounded-[10px] border border-line bg-white p-4 hover:border-magenta focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta">
              <CategoryIcon icon={c.icon} className="h-7 w-7 shrink-0 text-magenta" />
              <span className="min-w-0"><b className="block text-[15px]">{c.name}</b><small className="block text-[12.5px] text-ink-2">{c.examples}</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <>
          {/* SA-E004: filters as one chip row under the bar. */}
          <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 text-[12.5px]" data-shop-chips>
            {STORE_PRICE.map((p) => chip("price", p.value, p.label))}
            {STORE_LEAD.map((p) => chip("lead", p.value, p.label))}
            {hasPlace && STORE_DELIVERY.map((p) => chip("delivery", p.value, p.label))}
            {chip("rating", "4", "★ 4+")}
            {chip("certified", "1", "Certified seller")}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-ink-2" data-results-count>
            <span>{products.length} product{products.length === 1 ? "" : "s"}{f.category ? ` in ${f.category}` : ""}{f.q?.trim() ? ` for “${f.q.trim()}”` : ""}</span>
            <Link href="/shop?tab=browse" className="font-semibold text-magenta-dark underline underline-offset-4">Clear</Link>
          </p>
          <div className="mt-2">
            {products.length ? <ShopResults products={products} compare={compare} signedIn /> : !info.length && <p className="text-[14px] text-ink-3">Nothing matches yet. Try another Category, or <Link href="/hire" className="font-semibold text-magenta-dark underline">post the job under Hire</Link>.</p>}
          </div>
          {info.length > 0 && (
            <section className="mt-6" data-informational-items>
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Informational Items</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                {info.map((l) => (
                  <article key={l.id} className="flex flex-col gap-1 rounded-[10px] border border-line bg-white p-3.5" data-info-card>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-magenta-dark"><HelpTypeIcon type={l.type} className="h-4 w-4" /><span className="border border-magenta px-1">Info</span>{HELP_TYPES.find((t) => t.value === l.type)?.label}</span>
                    <h3 className="text-[15px] font-extrabold leading-snug">{l.title}</h3>
                    {l.description && <p className="line-clamp-2 text-[12.5px] text-ink-2">{l.description}</p>}
                    <Link href={`/help/view/${l.id}`} className="mt-auto inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover">Open</Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

async function CompareTab({ viewer, ids }: { viewer: Viewer; ids: string[] }) {
  const all = ids.length ? await listShopProducts(undefined, await seesTestAccounts(viewer)).then((l) => hideProviderIdentity(l, viewer)) : [];
  return <ShopCompare products={ids.map((id) => all.find((p) => p.id === id)).filter((p): p is (typeof all)[number] => !!p)} signedIn />;
}

async function CartTab({ viewer }: { viewer: Viewer }) {
  const c = await cartFor(viewer);
  return <section className="py-4"><CartView groups={c.groups} totalCents={c.totalCents} currency={c.currency} hasCompany={c.hasCompany} workRequest={c.workRequest} /></section>;
}

async function OffersTab({ viewer, personId, side, slice }: { viewer: Viewer; personId: string; side: "buyer" | "seller"; slice?: string }) {
  const rows = await shopOffers(viewer, personId, side);
  const s = sliceOf(slice);
  return (
    <section className="py-4">
      <h2 className="mb-2 text-[22px] font-bold">Offers</h2>
      <SliceChips tabKey="shop-offers" counts={sliceCounts(rows)} base="/shop?tab=offers" />
      <ShopOffers rows={rows.filter((r) => inSlice(r, s))} side={side} />
    </section>
  );
}

async function OrdersTab({ viewer, personId, side, step, slice }: { viewer: Viewer; personId: string; side: "buyer" | "seller"; step: string | null; slice?: string }) {
  const rows = await shopOrders(viewer, personId, side);
  const s = step ? "all" : sliceOf(slice);
  const list = (step ? rows.filter((r) => r.step === step) : rows).filter((r) => inSlice(r, s));
  const tabName = side === "buyer" ? "purchases" : "sales";
  return (
    <section className="py-4">
      <h2 className="mb-2 text-[22px] font-bold">{side === "buyer" ? "Purchases" : "Sales"}{step ? <small className="ml-2 text-[13px] font-semibold text-ink-3">{step} · <Link href={`/shop?tab=${side === "buyer" ? "purchases" : "sales"}`} className="text-magenta-dark underline">All</Link></small> : null}</h2>
      <SliceChips tabKey={`shop-${tabName}`} counts={sliceCounts(rows)} base={`/shop?tab=${tabName}`} />
      <ShopOrders rows={list} side={side} empty={side === "buyer" ? "No purchases yet." : "No product sales yet."} />
    </section>
  );
}
