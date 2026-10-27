"use client";

import { TypeArt } from "@/components/shop/TypeArt";
import Link from "next/link";
import type { ReactNode } from "react";
import { BuyButtons } from "@/components/shop/BuyButtons";
import { priceLabel } from "@/lib/price-label";
import { deliveryLabel, useCompare, type ResultProduct } from "@/components/shop/ShopResults";

// SA-E005: side by side, one Product Type, up to 3 — cheapest and fastest highlighted; Buy / Make an Offer / Remove per column.
export function ShopCompare({ products, signedIn }: { products: ResultProduct[]; signedIn: boolean }) {
  const { list, toggle } = useCompare(products.map((p) => ({ id: p.id, productTypeId: p.productTypeId })));
  const shown = products.filter((p) => list.some((x) => x.id === p.id));
  if (!shown.length) return <p className="py-6 text-[14px] text-ink-3">Nothing to compare yet — tick <b>Compare</b> on up to 3 products of the same type in <Link href="/shop?tab=browse" className="font-semibold text-magenta-dark underline">Browse</Link>.</p>;
  const prices = shown.map((p) => p.priceCents).filter((c): c is number => c != null);
  const leads = shown.map((p) => p.leadDays).filter((d): d is number => d != null);
  const cheapest = prices.length > 1 ? Math.min(...prices) : null;
  const fastest = leads.length > 1 ? Math.min(...leads) : null;
  const HL = "rounded-full bg-magenta/10 px-2 py-0.5 font-bold text-magenta-dark";
  const rows: [string, (p: ResultProduct) => ReactNode][] = [
    ["Price", (p) => <span className={p.priceCents != null && p.priceCents === cheapest ? HL : "font-bold"}>{priceLabel(p)}{p.priceCents != null && p.priceCents === cheapest ? " · cheapest" : ""}</span>],
    ["Delivery", (p) => <span className={p.leadDays != null && p.leadDays === fastest ? HL : ""}>{deliveryLabel(p)}{p.leadDays != null && p.leadDays === fastest ? " · fastest" : ""}</span>],
    ["What's included", (p) => (p.deliverables.length ? <ul className="list-disc pl-4">{p.deliverables.slice(0, 6).map((d, i) => <li key={i}>{d}</li>)}</ul> : "—")],
    ["Rating", (p) => (p.rating != null ? `★ ${p.rating.toFixed(1)}` : "—")],
    ["Certified", (p) => (p.certified ? "Yes" : "No")],
    ["Seller", (p) => p.providerName],
  ];
  return (
    <section className="py-4" data-shop-compare>
      <h2 className="text-[22px] font-bold">Compare <small className="text-[13px] font-semibold text-ink-3">{shown[0].typeName ?? "Products"}</small></h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
          <thead><tr><th className="w-32" />{shown.map((p) => <th key={p.id} className="border-b border-line p-2 text-left align-bottom"><TypeArt typeName={p.typeName} category={p.category} className="mb-2" /><Link href={`/shop/${p.id}`} className="text-[14.5px] font-extrabold hover:underline">{p.title}</Link></th>)}</tr></thead>
          <tbody>
            {rows.map(([label, cell]) => <tr key={label}><th className="border-b border-line p-2 text-left align-top text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-3">{label}</th>{shown.map((p) => <td key={p.id} className="border-b border-line p-2 align-top">{cell(p)}</td>)}</tr>)}
            <tr><th />{shown.map((p) => <td key={p.id} className="p-2 align-top"><div className="flex flex-col items-start gap-2"><BuyButtons productId={p.id} signedIn={signedIn} openToOffers={p.openToOffers} size="sm" pair /><button type="button" onClick={() => toggle(p)} className="text-[12.5px] font-semibold text-ink-2 underline underline-offset-4">Remove</button></div></td>)}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
