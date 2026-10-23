"use client";

import { TypeArt } from "@/components/shop/TypeArt";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/components/MeProvider";
import { formatCents } from "@/lib/display";
import { waitingLine as waitingText } from "@/lib/pending-join-copy";
import type { CartGroup } from "@/lib/cart";

const BTN_K = "inline-flex min-h-11 items-center justify-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";

type WR = { id: string; wrNumber: string | null; description: string; descriptionRequired: boolean } | null;

// JW-E008: the buyer's Work Request (Incomplete) — lines by provider, a description, then Submit (one work order per seller).
export function CartView({ groups, totalCents, currency, hasCompany, workRequest }: { groups: CartGroup[]; totalCents: number; currency: string; hasCompany: boolean; workRequest?: WR }) {
  const router = useRouter();
  const { me, refresh } = useMe();
  // PB-E002: while the company admin hasn't approved them, Submit stays visible but waits.
  const waiting = me?.pendingJoin ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<{ items: { company: string; item: string; done: boolean; href?: string }[]; isAdmin: boolean } | null>(null);
  const [placed, setPlaced] = useState<{ orderId: string; providerName: string; open: boolean }[] | null>(null);
  const [description, setDescription] = useState(workRequest?.description ?? "");
  const needsDescription = !!workRequest?.descriptionRequired && !description.trim();

  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    setGate(null);
    const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; gate?: typeof gate; orders?: { orderId: string; providerName: string; open: boolean }[] };
    setBusy(false);
    if (!r.ok && j.gate) return setGate(j.gate);
    if (!r.ok) return setError(j.error ?? "Something went wrong. Try again.");
    if (j.orders) setPlaced(j.orders);
    refresh();
    router.refresh();
  };

  if (placed)
    return (
      <section data-order-placed className="mt-6 border-t border-line pt-5">
        <h2 className="text-[20px] font-bold">Request Submitted</h2>
        <ul className="mt-3 grid gap-2 text-[14.5px]">
          {placed.map((o) => (
            <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
              <span><b>{o.providerName}</b> · {o.open ? "Open. The provider can start." : "Waiting on the provider to accept."}</span>
              <Link href={`/orders/${o.orderId}`} className="text-[14px] font-semibold underline underline-offset-4">View Order</Link>
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
                <TypeArt typeName={l.typeName} category={l.category} />
                <div className="min-w-0 flex-1">
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
      <label className="mt-6 block border-t border-line pt-4 text-[13px] font-semibold">
        Description{workRequest?.descriptionRequired ? "" : " (optional)"}
        <input data-wr-description value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="What is this request for?" className="mt-1 block h-11 w-full border border-line bg-surface px-3 text-[14.5px] font-normal text-ink" />
      </label>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4">
        <span className="text-[18px] font-bold">Total {formatCents(totalCents, currency)}</span>
        {hasCompany ? (
          <button type="button" data-place-order disabled={busy || needsDescription || !!waiting} title={needsDescription ? "Add a description first" : undefined} onClick={() => post({ action: "place", description })} className={BTN_K}>{busy ? "Submitting…" : "Submit"}</button>
        ) : (
          <Link href="/company" className={BTN_K}>Add Your Company to Submit</Link>
        )}
      </div>
      {waiting && <p data-waiting-line className="mt-2 text-right text-[13px] text-ink-2">{waitingText(waiting)}</p>}
      {groups.length > 1 && <p className="mt-2 text-right text-[12.5px] text-ink-2">One order per provider.</p>}
      {error && <p role="alert" className="mt-2 text-right text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
      {gate && (
        <div role="alert" data-order-gate className="mt-3 border-l-2 border-magenta py-1 pl-3 text-[13.5px]">
          <b>Before you order, add your company&apos;s billing details:</b>
          <ul className="mt-1">
            {gate.items.filter((i) => !i.done).map((i) => (
              <li key={`${i.company}-${i.item}`}>
                {i.href && gate.isAdmin ? <a href={i.href} className="font-semibold text-magenta-dark underline underline-offset-2">{`Add ${i.item}`}</a> : <span>{`${i.company}: ${i.item}`}</span>}
              </li>
            ))}
          </ul>
          {!gate.isAdmin && <p className="mt-1 text-ink-2">Ask your company admin to add them.</p>}
        </div>
      )}
    </div>
  );
}

const l0 = (g: CartGroup) => g.lines[0]?.currency ?? "USD";
