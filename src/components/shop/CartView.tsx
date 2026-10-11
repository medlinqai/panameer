"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/MeProvider";
import { formatCents } from "@/lib/display";
import type { CartGroup } from "@/lib/cart";

const BTN_K = "inline-flex min-h-11 items-center justify-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";

// SH-E002/E003: lines by provider, quantity and Remove, totals, each line's payment schedule, then Place Order.
export function CartView({ groups, totalCents, currency, hasCompany }: { groups: CartGroup[]; totalCents: number; currency: string; hasCompany: boolean }) {
  const router = useRouter();
  const { refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderId: string; providerName: string; open: boolean }[] | null>(null);

  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; orders?: { orderId: string; providerName: string; open: boolean }[] };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Something went wrong. Try again.");
    if (j.orders) setPlaced(j.orders);
    refresh();
    router.refresh();
  };

  if (placed)
    return (
      <section data-order-placed className="mt-6 border-t border-line pt-5">
        <h2 className="text-[20px] font-bold">Order Placed</h2>
        <ul className="mt-3 grid gap-2 text-[14.5px]">
          {placed.map((o) => (
            <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
              <span><b>{o.providerName}</b> · {o.open ? "Open. The provider can start." : "Waiting on the provider to accept."}</span>
              <Link href={`/orders/${o.orderId}`} className="text-[14px] font-semibold underline underline-offset-4">View Work Order</Link>
            </li>
          ))}
        </ul>
        <Link href="/shop" className="mt-5 inline-block text-[14px] font-semibold underline underline-offset-4">Keep Shopping</Link>
      </section>
    );

  if (!groups.length)
    return (
      <p className="mt-6 border-t border-line pt-5 text-[14.5px] text-ink-2">
        Your cart is empty. <Link href="/shop" className="font-semibold text-ink underline underline-offset-4">Shop Service Products</Link>
      </p>
    );

  return (
    <div className="mt-4">
      {groups.map((g) => (
        <section key={g.providerPersonId} data-cart-provider className="mt-5 border-t border-line pt-4">
          <h2 className="text-[17px] font-bold">
            <Link href={`/providers/${g.providerProfileId}`} className="hover:underline">{g.providerName}</Link>
          </h2>
          <p className="text-[12.5px] text-ink-2">{g.manual ? "Accepts orders manually: your order waits for their acceptance." : "Orders open as soon as you place them."}</p>
          <ul className="mt-2">
            {g.lines.map((l) => (
              <li key={l.id} data-cart-line className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3">
                <div className="min-w-0">
                  <Link href={`/shop/${l.productId}`} className="text-[15px] font-semibold hover:underline">{l.title}</Link>
                  <p className="text-[13px] text-ink-2">{formatCents(l.unitCents, l.currency)} / {l.unit} · {l.schedule}</p>
                  {!l.available && <p className="text-[13px] font-semibold text-magenta-dark">No longer available. Remove it to place your order.</p>}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[12px] font-semibold text-ink-2">
                    {l.unit === "hour" ? "Hours" : "Qty"}
                    <select aria-label={`Quantity for ${l.title}`} disabled={busy} value={l.quantity} onChange={(e) => post({ action: "qty", lineId: l.id, quantity: Number(e.target.value) })} className="ml-1.5 h-9 border border-line bg-surface px-2 text-[14px] text-ink">
                      {Array.from({ length: Math.max(20, l.quantity) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <b className="w-24 text-right text-[14.5px] tabular-nums">{formatCents(l.lineCents, l.currency)}</b>
                  <button type="button" disabled={busy} onClick={() => post({ action: "remove", lineId: l.id })} className="text-[13px] font-semibold underline underline-offset-4">Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right text-[14px]">Total for {g.providerName}: <b className="tabular-nums">{formatCents(g.totalCents, l0(g))}</b></p>
        </section>
      ))}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <span className="text-[18px] font-bold">Total {formatCents(totalCents, currency)}</span>
        {hasCompany ? (
          <button type="button" data-place-order disabled={busy} onClick={() => post({ action: "place" })} className={BTN_K}>{busy ? "Placing…" : "Place Order"}</button>
        ) : (
          <Link href="/company" className={BTN_K}>Add Your Company to Order</Link>
        )}
      </div>
      {groups.length > 1 && <p className="mt-2 text-right text-[12.5px] text-ink-2">One work order per provider.</p>}
      {error && <p role="alert" className="mt-2 text-right text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}

const l0 = (g: CartGroup) => g.lines[0]?.currency ?? "USD";
