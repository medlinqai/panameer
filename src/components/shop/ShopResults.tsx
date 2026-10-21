"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopProduct } from "@/lib/shop";
import { BuyButtons } from "@/components/shop/BuyButtons";
import { NeutralAvatar } from "@/components/Avatar";
import { priceLabel } from "@/components/shop/ProductCard";

// SA-E004/E005: results as rows (like Hire matches) with a detail pane; ☐ Compare keeps up to 3 of one Product Type in a cookie.
export type ResultProduct = Pick<ShopProduct, "id" | "title" | "summary" | "kind" | "pricingType" | "billingPeriod" | "priceCents" | "currency" | "durationWeeks" | "providerName" | "providerProfileId" | "typeName" | "productTypeId" | "leadDays" | "deliverables" | "rating" | "certified" | "openToOffers" | "coverUrl" | "terms">;
const COOKIE = "pm_compare";

export function setCompare(ids: string[]) {
  document.cookie = `${COOKIE}=${ids.slice(0, 3).join(",")}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
export const deliveryLabel = (p: Pick<ShopProduct, "leadDays" | "durationWeeks">) => (p.leadDays != null ? `${p.leadDays} day${p.leadDays === 1 ? "" : "s"}` : p.durationWeeks ? `${p.durationWeeks} wk` : "—");

export function useCompare(initial: { id: string; productTypeId: string | null }[]) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const toggle = (p: { id: string; productTypeId: string | null }) => {
    if (list.some((x) => x.id === p.id)) { const next = list.filter((x) => x.id !== p.id); setList(next); setCompare(next.map((x) => x.id)); router.refresh(); return; }
    if (list.length && list[0].productTypeId !== p.productTypeId) {
      if (!window.confirm("Compare works within one product type — start a new comparison?")) return;
      setList([p]); setCompare([p.id]); router.refresh(); return;
    }
    if (list.length >= 3) { window.alert("Compare up to 3 products. Remove one first."); return; }
    const next = [...list, p]; setList(next); setCompare(next.map((x) => x.id)); router.refresh();
  };
  return { list, toggle };
}

export function ShopResults({ products, compare, signedIn }: { products: ResultProduct[]; compare: { id: string; productTypeId: string | null }[]; signedIn: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const { list, toggle } = useCompare(compare);
  const at = products.findIndex((p) => p.id === active);
  const cur = at >= 0 ? products[at] : null;
  return (
    <div data-shop-results>
      <ul className="divide-y divide-line border-y border-line">
        {products.map((p) => {
          const on = list.some((x) => x.id === p.id);
          return (
            <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 sm:flex-nowrap ${active === p.id ? "bg-[#fbeafb]/40" : ""}`} data-shop-row>
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
              ) : <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] bg-bg-soft text-[18px] text-ink-3">◆</span>}
              <button type="button" onClick={() => setActive(p.id)} className="min-w-0 flex-1 basis-[calc(100%-68px)] text-left sm:basis-auto" data-shop-row-open>
                <b className="block truncate text-[14.5px] hover:underline">{p.title}</b>
                <span className="block truncate text-[12.5px] text-ink-2">{[p.typeName, deliveryLabel(p) !== "—" ? `delivery ${deliveryLabel(p)}` : null, p.providerName].filter(Boolean).join(" · ")}</span>
              </button>
              <b className="ml-[68px] shrink-0 text-[14px] tabular-nums sm:ml-0">{priceLabel(p)}</b>
              <label className="flex shrink-0 items-center gap-1 text-[12px] font-semibold"><input type="checkbox" checked={on} onChange={() => toggle(p)} className="h-4 w-4" data-compare-box />Compare</label>
            </li>
          );
        })}
      </ul>
      {cur && (
        <aside role="dialog" aria-label={cur.title} data-shop-pane className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white p-5 shadow-[-8px_0_24px_rgba(0,0,0,0.12)] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:border-l md:border-line">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-magenta-dark">{cur.typeName ?? "Product"}</p>
              <h2 className="text-[18px] font-extrabold leading-snug">{cur.title}</h2>
            </div>
            <button type="button" onClick={() => setActive(null)} aria-label="Close" className="text-[22px] leading-none text-ink-3 hover:text-ink">×</button>
          </div>
          <p className="mt-2 text-[22px] font-extrabold tabular-nums">{priceLabel(cur)}</p>
          <p className="text-[13px] text-ink-2">{cur.pricingType === "HOURLY" ? "Service – Rate · Services" : "Product · Goods"} · Delivery {deliveryLabel(cur)}{cur.terms ? ` · ${cur.terms}` : ""}</p>
          {cur.summary && <p className="mt-3 text-[14px] text-ink-2">{cur.summary}</p>}
          <h3 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-3">What&apos;s included</h3>
          {cur.deliverables.length ? <ul className="mt-1 list-disc pl-5 text-[13.5px]">{cur.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul> : <p className="text-[13.5px] text-ink-3">See the product page.</p>}
          <h3 className="mt-4 text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-3">Seller</h3>
          <p className="mt-1 flex items-center gap-2 text-[14px]"><NeutralAvatar size={28} /><b>{cur.providerName}</b>{cur.rating != null && <span className="text-magenta-dark">★ {cur.rating.toFixed(1)}</span>}{cur.certified && <span className="rounded-full border border-ink px-2 text-[11px] font-bold">Certified</span>}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <BuyButtons productId={cur.id} signedIn={signedIn} openToOffers={cur.openToOffers} pair />
            <button type="button" onClick={() => toggle(cur)} className="inline-flex min-h-10 items-center border border-ink px-4 text-[13.5px] font-semibold hover:bg-bg-soft">{list.some((x) => x.id === cur.id) ? "In Compare ✓" : "Add to Compare"}</button>
          </div>
          <Link href={`/shop/${cur.id}`} className="mt-4 text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">Open the product page</Link>
          <p className="mt-2 text-[13.5px]">Need it different? <Link href={`/shop/estimates/new?product=${cur.id}`} className="font-semibold text-magenta-dark underline underline-offset-4" data-request-estimate-link>Request an Estimate</Link></p>
          <div className="mt-auto flex justify-between gap-3 border-t border-line pt-4">
            <button type="button" disabled={at <= 0} onClick={() => setActive(products[at - 1].id)} className="inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold disabled:opacity-40">‹ Previous</button>
            <button type="button" disabled={at >= products.length - 1} onClick={() => setActive(products[at + 1].id)} className="inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold disabled:opacity-40">Next ›</button>
          </div>
        </aside>
      )}
    </div>
  );
}
