"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/display";

// MO-E004: offers on Service Products — seller: Accept · Counter (once) · Decline; buyer: status, answer a counter, withdraw.
export type Offer = { id: string; offerNumber: string; productId: string | null; serviceId: string | null; productTitle: string; listPriceCents: number | null; amountCents: number; counterCents: number | null; deliveryDate: string | null; counterDeliveryDate: string | null; currency: string; status: string; note: string | null; message: string | null; otherName: string };
const STATUS: Record<string, string> = { OPEN: "Waiting on the seller", COUNTERED: "Countered — your call", ACCEPTED: "Accepted — in your cart", DENIED: "Declined", WITHDRAWN: "Closed" };
const BTN = "min-h-9 border border-ink px-3 text-[13px] font-semibold disabled:opacity-40";
const PRI = "min-h-9 bg-ink px-3 text-[13px] font-semibold text-surface disabled:opacity-40";

export function OffersList({ offers, side }: { offers: Offer[]; side: "seller" | "buyer" }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [counter, setCounter] = useState<Record<string, string>>({});
  const [counterDate, setCounterDate] = useState<Record<string, string>>({});
  const post = async (o: Offer, body: object) => {
    setBusy(o.id);
    const r = await fetch(side === "seller" ? "/api/provider/offers" : "/api/shop/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offerId: o.id, ...body }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return setMsg((m) => ({ ...m, [o.id]: j.error ?? "Could not do that" }));
    router.refresh();
  };
  const money = (c: number, cur: string) => formatCents(c, cur).replace(/\.00$/, "");
  if (!offers.length) return <p className="border-t border-line pt-3 text-[14px] text-ink-2">{side === "seller" ? "No offers right now. Turn on Open to Offers on a Service Product to get them." : "You haven't made any offers."}</p>;
  return (
    <ul className="border-t border-line" data-offers={side}>
      {offers.map((o) => (
        <li key={o.id} data-offer={o.status} className="grid gap-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <span className="min-w-0">
            {o.productId ? <Link href={`/shop/${o.productId}`} className="font-bold hover:underline">{o.productTitle}</Link> : <b>{o.productTitle}</b>}
            <span className="block text-[12.5px] text-ink-2">
              {`${o.offerNumber} · ${o.otherName} · offered ${money(o.amountCents, o.currency)}${o.deliveryDate ? ` by ${o.deliveryDate}` : ""}${o.listPriceCents != null ? ` (list ${money(o.listPriceCents, o.currency)})` : ""}${o.counterCents != null ? ` · counter ${money(o.counterCents, o.currency)}${o.counterDeliveryDate ? ` by ${o.counterDeliveryDate}` : ""}` : ""}`}
            </span>
            {o.note && <span className="block text-[12.5px] text-ink-2">{`“${o.note}”`}</span>}
            {side === "buyer" && <span className={o.status === "COUNTERED" ? "mt-0.5 inline-block border border-magenta px-1.5 text-[11px] font-bold text-magenta-dark" : "mt-0.5 inline-block border border-line px-1.5 text-[11px] font-bold text-ink-2"}>{STATUS[o.status] ?? o.status}</span>}
            {side === "buyer" && o.message && <span className="block text-[12.5px] text-ink-2">{o.message}</span>}
            {msg[o.id] && <span role="alert" className="block text-[12.5px] font-semibold text-magenta-dark">{msg[o.id]}</span>}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {side === "seller" && o.status === "OPEN" && (
              <>
                <button type="button" disabled={!!busy} onClick={() => post(o, { action: "accept" })} data-accept className={PRI}>Accept</button>
                <span className="inline-flex items-center border border-line">
                  <span className="px-1.5 text-[13px] text-ink-3">$</span>
                  <input inputMode="decimal" aria-label="Counter amount" value={counter[o.id] ?? ""} onChange={(e) => setCounter((c) => ({ ...c, [o.id]: e.target.value }))} className="w-20 border-0 py-1.5 text-[13px] outline-none" />
                  <input type="date" aria-label="Counter delivery date" value={counterDate[o.id] ?? ""} onChange={(e) => setCounterDate((c) => ({ ...c, [o.id]: e.target.value }))} className="border-0 border-l border-line px-1 py-1.5 text-[12.5px] outline-none" />
                  <button type="button" disabled={!!busy || !(Number(counter[o.id]) > 0 || counterDate[o.id])} onClick={() => post(o, { action: "counter", amountCents: Number(counter[o.id]) > 0 ? Math.round(Number(counter[o.id]) * 100) : null, deliveryDate: counterDate[o.id] || null })} data-counter className="border-l border-line px-2 py-1.5 text-[13px] font-semibold disabled:opacity-40">Counter</button>
                </span>
                <button type="button" disabled={!!busy} onClick={() => post(o, { action: "deny" })} data-decline className={BTN}>Decline</button>
              </>
            )}
            {side === "buyer" && o.status === "COUNTERED" && (
              <>
                <button type="button" disabled={!!busy} onClick={() => post(o, { action: "answer", accept: true })} data-accept-counter className={PRI}>{`Accept ${o.counterCents != null ? money(o.counterCents, o.currency) : ""}`}</button>
                <button type="button" disabled={!!busy} onClick={() => post(o, { action: "answer", accept: false })} className={BTN}>Decline</button>
              </>
            )}
            {side === "buyer" && o.status === "OPEN" && <button type="button" disabled={!!busy} onClick={() => post(o, { action: "withdraw" })} className={BTN}>Withdraw</button>}
            {side === "buyer" && o.status === "ACCEPTED" && <Link href="/cart" className="text-[13px] font-bold text-magenta-dark underline">Go to Cart</Link>}
          </span>
        </li>
      ))}
    </ul>
  );
}
