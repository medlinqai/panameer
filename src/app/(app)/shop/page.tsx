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
import { RedDot } from "@/components/home/AppHome";
import { BTN as HL_BTN, BTN_OUT as HL_BTN_OUT, HeadRow, PathBand, RedDot as HLRedDot, type BandStep } from "@/components/hire/HireUI";
import { buyerEstimateEvents, sellerEstimateRequests } from "@/lib/estimate-events";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";
import { COMPARE_COOKIE, parseCompare, productTypesByCategory, shopCounts, shopOffers, shopOrders, shopPerson, shopSideOf, shopStrip } from "@/lib/shop-app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop · Panameer" };

type Q = StoreQuery & { step?: string; slice?: string };
const BUYER_TABS = ["overview", "browse", "compare", "cart", "offers", "estimates", "purchases"] as const;
const SELLER_TABS = ["overview", "browse", "offers", "estimates", "sales"] as const;

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
        { label: `Cart (${counts?.cart ?? 0})`, href: "/shop?tab=cart" },
        { label: "Offers", href: "/shop?tab=offers", badge: counts?.offers },
        { label: "Estimates", href: "/shop?tab=estimates", badge: counts?.estimates },
        { label: "Purchases", href: "/shop?tab=purchases", badge: counts?.purchases },
      ]
    : [
        { label: "Overview", href: "/shop", badge: counts?.total },
        { label: "Browse", href: "/shop?tab=browse" },
        { label: "My Products", href: "/catalog/products" },
        { label: "Offers", href: "/shop?tab=offers", badge: counts?.offers },
        { label: "Estimates", href: "/shop?tab=estimates", badge: counts?.estimates },
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
        {tab === "estimates" && person && (side === "buyer" ? <BuyerEstimatesTab personId={person.id} slice={f.slice} /> : <SellerEstimatesTab personId={person.id} slice={f.slice} />)}
        {tab === "offers" && person && <OffersTab viewer={viewer} personId={person.id} side={side} slice={f.slice} />}
        {(tab === "purchases" || tab === "sales") && person && <OrdersTab viewer={viewer} personId={person.id} side={side} step={f.step ?? null} slice={f.slice} />}
      </div>
    </div>
  );
}

type Viewer = Awaited<ReturnType<typeof memberOrPublicTwin>>;

// HL-E005: Shop Overview in the Hire Overview layout — headline + attention rows, one thin band, two columns.
async function Overview({ viewer, personId, side, counts }: { viewer: Viewer; personId: string; side: "buyer" | "seller"; counts: Awaited<ReturnType<typeof shopCounts>> }) {
  const [strip, offers, orders, est] = await Promise.all([
    shopStrip(viewer, personId, side), shopOffers(viewer, personId, side), shopOrders(viewer, personId, side),
    side === "buyer" ? buyerEstimateEvents(personId) : sellerEstimateRequests(personId),
  ]);
  const usd0 = (c: number | null) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
  type Item = { id: string; step: string; what: string; detail: string; href: string; action: string };
  const items: Item[] = [
    ...offers.filter((o) => o.needsAction).map((o) => ({ id: `o-${o.id}`, step: "offer", what: side === "buyer" ? `Answer the counter-offer on ${o.product}` : `Answer an offer on ${o.product}`, detail: [`offered ${usd0(o.amountCents)}`, o.counterCents != null ? `counter ${usd0(o.counterCents)}` : null, o.respondBy ? `respond by ${o.respondBy}` : null].filter(Boolean).join(" · "), href: "/shop?tab=offers", action: "Answer" })),
    ...(side === "buyer"
      ? (est as Awaited<ReturnType<typeof buyerEstimateEvents>>).filter((e) => e.needsAction).map((e) => ({ id: `e-${e.id}`, step: "estimate", what: `Review estimates for ${e.what}`, detail: [`${e.in} of ${e.asked} in`, e.range, `due ${e.due}`].filter(Boolean).join(" · "), href: `/shop/estimates/${e.id}`, action: "Review" }))
      : (est as Awaited<ReturnType<typeof sellerEstimateRequests>>).filter((e) => e.needsAction).map((e) => ({ id: `e-${e.id}`, step: "estimate", what: `Price an estimate: ${e.what}`, detail: [e.buyer, e.due ? `due ${e.due}` : null].filter(Boolean).join(" · "), href: `/catalog/estimates/new?request=${e.id}`, action: "Price it" }))),
    ...orders.filter((o) => o.needsAction && o.action).map((o) => ({ id: `w-${o.id}`, step: o.stepIndex >= 5 ? "paid" : o.stepIndex === 4 ? "delivered" : "wo", what: `${o.action!.label} · ${o.number}`, detail: `${o.product} · ${o.stepDetail}`, href: o.action!.href, action: o.action!.label })),
  ];
  const n = items.length;
  const needs = new Set(items.map((i) => i.step));
  const firstNeed = strip.findIndex((x) => needs.has(x.key));
  const lastBusy = Math.max(-1, ...strip.map((x, k) => (x.count > 0 ? k : -1)));
  const active = firstNeed >= 0 ? firstNeed : lastBusy;
  const band: BandStep[] = strip.map((x, k) => ({ key: x.key, label: x.label, href: x.href, current: k === active, needs: needs.has(x.key), muted: !x.count && k !== active, bar: k <= active ? "done" : "todo", top: <span className={`text-[22px] font-extrabold ${x.count ? (k === active ? "text-magenta" : "text-ink") : "text-[#c9c4d6]"}`}>{x.count}</span> }));
  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  const sentence = n ? `${n === 1 ? "One thing" : `${n} things`} in Shop ${n === 1 ? "is" : "are"} waiting on you.` : side === "buyer" ? `Nothing is waiting on you.${counts.cart ? ` You have ${counts.cart} item${counts.cart === 1 ? "" : "s"} in your cart.` : ""}` : "Nothing is waiting on you. New offers, estimate requests and orders show here.";
  return (
    <div className="flex flex-col gap-10 pt-6">
      <section className="flex flex-wrap items-start gap-10" data-shop-today>
        <div className="min-w-0 flex-[1_1_320px]">
          <span className="text-[12px] font-bold tracking-[0.12em] text-magenta">{dateLabel}</span>
          <h1 className="mb-2.5 mt-2 text-[28px] font-extrabold leading-[1.15] sm:text-[34px]">{n ? `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you today` : "Nothing needs you today"}</h1>
          <p className="text-[15px] leading-relaxed text-[#5d5768]">{sentence}</p>
          <div className="mt-4 flex flex-wrap gap-2.5">{side === "buyer" ? <><Link href="/shop?tab=browse" className={HL_BTN}>Browse Products</Link><Link href="/shop?tab=purchases" className={HL_BTN_OUT}>My Purchases</Link></> : <><Link href="/catalog/products" className={HL_BTN}>Add a Product</Link><Link href="/shop?tab=sales" className={HL_BTN_OUT}>My Sales</Link></>}</div>
        </div>
        {n > 0 && (
          <div className="flex min-w-0 flex-[1_1_480px] flex-col border-b border-[#e7e5ec]">
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-3.5 border-t border-[#e7e5ec] py-4 sm:flex-nowrap" data-today-item={it.step}>
                <HLRedDot />
                <div className="min-w-0 flex-1"><div className="text-[15px] font-bold">{it.what}</div><div className="text-[13px] text-[#5d5768]">{it.detail}</div></div>
                <Link href={it.href} className={`${HL_BTN_OUT} w-full sm:w-auto`}>{it.action}</Link>
              </div>
            ))}
          </div>
        )}
      </section>
      <PathBand steps={band} label="Shop path" />
      {side === "buyer" ? <BuyerLower viewer={viewer} personId={personId} /> : <SellerLower viewer={viewer} personId={personId} />}
    </div>
  );
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
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-2"><span>Looking to hire someone for a job? <Link href="/hire" className="font-bold text-magenta-dark">Hire →</Link></span><span>Need something custom? <Link href="/shop/estimates/new" className="font-bold text-magenta-dark" data-shop-estimates-button>Request an Estimate →</Link></span></p>
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
              <h2 className="mb-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Informational items</h2>
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

// ES-E004: one row per Estimate Event — what, ES number, asked · in, lowest–highest, due, step.
async function BuyerEstimatesTab({ personId, slice }: { personId: string; slice?: string }) {
  const all = await buyerEstimateEvents(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <section className="py-4" data-buyer-estimates>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold">Estimates</h2>
        <Link href="/shop/estimates/new" className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover">Request an Estimate</Link>
      </div>
      <div className="mt-2"><SliceChips tabKey="shop-estimates" counts={sliceCounts(all)} base="/shop?tab=estimates" /></div>
      {rows.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
              {r.needsAction ? <RedDot /> : <span className="w-2.5" />}
              <div className="min-w-0 flex-1">
                <Link href={`/shop/estimates/${r.id}`} className="block truncate text-[14.5px] font-bold hover:underline">{r.what}</Link>
                <p className="text-[12.5px] text-ink-2"><span className="font-mono">{r.number}</span> · {r.in} of {r.asked} in{r.range ? ` · ${r.range}` : ""} · due {r.due} · <b className="text-ink">{r.step}</b></p>
              </div>
              <Link href={`/shop/estimates/${r.id}`} className={r.needsAction ? "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover" : "inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold hover:bg-bg-soft"}>{r.needsAction ? "Review estimates" : "Open"}</Link>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-[14px] text-ink-3">No estimate requests here.</p>}
    </section>
  );
}

// ES-E003: seller — Estimates to Price.
async function SellerEstimatesTab({ personId, slice }: { personId: string; slice?: string }) {
  const all = await sellerEstimateRequests(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <section className="py-4" data-seller-estimates>
      <h2 className="text-[22px] font-bold">Estimates to Price</h2>
      <div className="mt-2"><SliceChips tabKey="shop-seller-estimates" counts={sliceCounts(all)} base="/shop?tab=estimates" /></div>
      {rows.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
              {r.needsAction ? <RedDot /> : <span className="w-2.5" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold">{r.what}</p>
                <p className="text-[12.5px] text-ink-2">{r.buyer}{r.jobTitle ? ` · ${r.jobTitle}` : ""}{r.due ? ` · due ${r.due}` : ""} · <b className="text-ink">{r.status}</b></p>
              </div>
              {r.needsAction && <Link href={`/catalog/estimates/new?request=${r.id}${r.estimateId ? `&id=${r.estimateId}` : ""}`} className="inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover" data-price-estimate>{r.estimateId ? "Revise" : "Price it"}</Link>}
              <Link href={`/estimates/requests/${r.id}`} className="inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold hover:bg-bg-soft">{r.needsAction ? "Decline" : "Open"}</Link>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-[14px] text-ink-3">No requests for estimates here.</p>}
    </section>
  );
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
      <h2 className="mb-2 text-[22px] font-bold">{side === "buyer" ? "Purchases" : "Sales"}{step ? <small className="ml-2 text-[13px] font-semibold text-ink-3">{step} · <Link href={`/shop?tab=${side === "buyer" ? "purchases" : "sales"}`} className="text-magenta-dark underline">all</Link></small> : null}</h2>
      <SliceChips tabKey={`shop-${tabName}`} counts={sliceCounts(rows)} base={`/shop?tab=${tabName}`} />
      <ShopOrders rows={list} side={side} empty={side === "buyer" ? "No purchases yet." : "No product sales yet."} />
    </section>
  );
}
