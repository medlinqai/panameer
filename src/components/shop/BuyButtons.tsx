"use client";

import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/MeProvider";

// SH-E001 / MO-E002: Buy Now (primary) · Add to Cart · Make an Offer (only when open to offers). Signed out → sign in first.
export function BuyButtons({ productId, signedIn, size = "md", openToOffers = false }: { productId: string; signedIn: boolean; size?: "sm" | "md"; openToOffers?: boolean }) {
  const { refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<{ open: boolean; amount: string; date: string; note: string; sent: string | null }>({ open: false, amount: "", date: "", note: "", sent: null });
  const primary = size === "sm" ? "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40" : "inline-flex min-h-11 items-center justify-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
  const secondary = size === "sm" ? "inline-flex min-h-9 items-center justify-center border border-ink bg-surface px-4 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40" : "inline-flex min-h-11 items-center justify-center border border-ink bg-surface px-6 text-[14px] font-semibold hover:bg-surface-hover disabled:opacity-40";
  if (!signedIn) {
    const back = `/login?callbackUrl=${encodeURIComponent(`/cart?add=${productId}`)}`;
    return (
      <div data-buy-buttons className="flex flex-wrap items-center gap-2">
        <Link href={back} className={primary}>Buy Now</Link>
        <Link href={back} className={secondary}>Add to Cart</Link>
        {openToOffers && <Link href={`/login?callbackUrl=${encodeURIComponent(`/shop/${productId}`)}`} className={secondary}>Make an Offer</Link>}
      </div>
    );
  }
  const add = async (buy: boolean) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", productId }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) {
      setBusy(false);
      setError(j.error ?? "Could not add that to your cart");
      return;
    }
    if (buy) return window.location.assign("/cart");
    setBusy(false);
    setAdded(true);
    refresh();
  };
  const sendOffer = async () => {
    // Lane 7: a different price and/or a delivery date.
    const cents = offer.amount.trim() ? Math.round(Number(offer.amount) * 100) : null;
    if (cents !== null && !(cents > 0)) return setError("Enter a price above zero");
    if (cents === null && !offer.date) return setError("Propose a price or a delivery date");
    setBusy(true);
    setError(null);
    const r = await fetch("/api/shop/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceProductId: productId, amountCents: cents, deliveryDate: offer.date || null, note: offer.note || null }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string; status?: string; message?: string };
    setBusy(false);
    if (!r.ok) return setError(j.error ?? "Could not send that offer");
    setOffer((o) => ({ ...o, open: false, sent: j.status === "DENIED" ? j.message ?? "The seller isn't taking offers at that price." : "Offer sent — the seller will accept, counter or decline. Track it in My Estimates." }));
  };
  return (
    <div data-buy-buttons className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={() => add(true)} className={primary}>Buy Now</button>
      {added ? (
        <Link href="/cart" className={secondary}>Added · View Cart</Link>
      ) : (
        <button type="button" disabled={busy} onClick={() => add(false)} className={secondary}>Add to Cart</button>
      )}
      {openToOffers && !offer.sent && <button type="button" disabled={busy} onClick={() => setOffer((o) => ({ ...o, open: !o.open }))} data-make-offer className={secondary}>Make an Offer</button>}
      {offer.open && (
        <div data-offer-form className="flex w-full flex-wrap items-center gap-2 border border-line p-2">
          <span className="inline-flex items-center border border-line bg-surface"><span className="px-2 text-ink-3">$</span><input inputMode="decimal" autoFocus aria-label="Your offer" value={offer.amount} onChange={(e) => setOffer((o) => ({ ...o, amount: e.target.value }))} className="w-24 border-0 py-2 text-[13.5px] outline-none" /></span>
          <label className="inline-flex items-center gap-1 text-[12.5px] text-ink-2">by <input type="date" aria-label="Delivery date" value={offer.date} onChange={(e) => setOffer((o) => ({ ...o, date: e.target.value }))} className="border border-line px-2 py-1.5 text-[13px]" /></label>
          <input aria-label="Note to the seller" placeholder="Note (optional)" value={offer.note} onChange={(e) => setOffer((o) => ({ ...o, note: e.target.value }))} className="min-w-0 flex-1 border border-line px-2 py-2 text-[13px]" />
          <button type="button" disabled={busy} onClick={sendOffer} className={primary}>Send Offer</button>
        </div>
      )}
      {offer.sent && <p role="status" data-offer-sent className="w-full text-[13px] font-semibold">{offer.sent} <Link href="/estimates#offers" className="text-magenta-dark underline">My Offers</Link></p>}
      {error && <p role="alert" className="w-full text-[13px] font-semibold text-magenta-dark">{error}{/add your company/i.test(error) && <> <Link href="/company?join=1#join" className="underline">Add Your Company</Link></>}</p>}
    </div>
  );
}
