"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopOfferRow, ShopOrderRow, ShopSide } from "@/lib/shop-app";
import { RedDot } from "@/components/home/AppHome";
import { RecurringLine } from "@/components/casing/SliceChips";

// SA-E006: Offers (thread per product: amount, counter, status, respond-by, Accept / Counter / Decline) and Purchases / Sales.
const usd = (c: number | null) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const STATUS: Record<string, string> = { OPEN: "Open", COUNTERED: "Countered", ACCEPTED: "Accepted", DENIED: "Declined", WITHDRAWN: "Withdrawn" };
const BTN = "inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold hover:bg-bg-soft disabled:opacity-40";

export function ShopOffers({ rows, side }: { rows: ShopOfferRow[]; side: ShopSide }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState<Record<string, string>>({});
  const call = async (url: string, body: object) => {
    setBusy(true); setError(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return false; }
    router.refresh();
    return true;
  };
  const buyerCounter = async (o: ShopOfferRow, cents: number) => {
    if (await call("/api/shop/offers", { action: "answer", offerId: o.id, accept: false })) await call("/api/shop/offers", { serviceProductId: o.productId, amountCents: cents });
  };
  if (!rows.length) return <p className="py-6 text-[14px] text-ink-3">{side === "buyer" ? "No offers yet — Make an Offer from a product." : "No offers on your products yet."}</p>;
  return (
    <ul className="divide-y divide-line border-y border-line" data-shop-offers>
      {rows.map((o) => {
        const c = counter[o.id] ?? "";
        const cents = Math.round(Number(c) * 100);
        return (
          <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            {o.needsAction ? <RedDot /> : <span className="w-2.5" />}
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-bold">{o.productId ? <Link href={`/shop/${o.productId}`} className="hover:underline">{o.product}</Link> : o.product}</p>
              <p className="text-[12.5px] text-ink-2">{o.number} · {o.who} · list {usd(o.listCents)} · offered <b className="text-ink">{usd(o.amountCents)}</b>{o.counterCents != null ? <> · counter <b className="text-ink">{usd(o.counterCents)}</b></> : null} · {STATUS[o.status] ?? o.status}{o.respondBy ? ` · respond by ${o.respondBy}` : ""}</p>
            </div>
            {o.needsAction && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" className={BTN} disabled={busy} onClick={() => (side === "buyer" ? call("/api/shop/offers", { action: "answer", offerId: o.id, accept: true }) : call("/api/provider/offers", { action: "accept", offerId: o.id }))}>Accept</button>
                <input inputMode="decimal" value={c} onChange={(e) => setCounter((m) => ({ ...m, [o.id]: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="$" aria-label="Counter amount" className="w-20 rounded-[8px] border border-line px-2 py-1.5 text-[13px]" />
                <button type="button" className={GHOST} disabled={busy || !cents} onClick={() => (side === "buyer" ? buyerCounter(o, cents) : call("/api/provider/offers", { action: "counter", offerId: o.id, amountCents: cents }))}>Counter</button>
                <button type="button" className={GHOST} disabled={busy} onClick={() => (side === "buyer" ? call("/api/shop/offers", { action: "answer", offerId: o.id, accept: false }) : call("/api/provider/offers", { action: "deny", offerId: o.id }))}>Decline</button>
              </div>
            )}
          </li>
        );
      })}
      {error && <li role="alert" className="py-2 text-[13.5px] font-semibold text-magenta-dark">{error}</li>}
    </ul>
  );
}

export function ShopOrders({ rows, empty, side = "buyer" }: { rows: ShopOrderRow[]; empty: string; side?: ShopSide }) {
  if (!rows.length) return <p className="py-6 text-[14px] text-ink-3">{empty}</p>;
  return (
    <ul className="divide-y divide-line border-y border-line" data-shop-orders>
      {rows.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
          {o.needsAction ? <RedDot /> : <span className="w-2.5" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold">{o.product}</p>
            <p className="text-[12.5px] text-ink-2"><span className="font-mono">{o.number}</span> · {o.who} · {usd(o.amountCents)} · {o.date} · <b className="text-ink">{o.completed ? "Completed" : o.step}</b></p>
            {o.recurring && <RecurringLine r={o.recurring} />}
          </div>
          {o.completed ? (side === "buyer" && o.productId ? <Link href={`/cart?add=${o.productId}`} className={GHOST} data-reorder>Reorder</Link> : <Link href={`/orders/${o.id}`} className={GHOST}>Open</Link>) : o.action && <Link href={o.action.href} className={o.needsAction ? BTN : GHOST}>{o.action.label}</Link>}
        </li>
      ))}
    </ul>
  );
}
