"use client";

import { useState } from "react";

// Buyer's offer on a service product. Starts at the listed price; the seller accepts or declines.
export function MakeOffer({ productId, priceCents, providerName }: { productId: string; priceCents: number | null; providerName: string }) {
  const [amount, setAmount] = useState(priceCents != null ? (priceCents / 100).toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/shop/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceProductId: productId, amountCents: Math.round(Number(amount) * 100) }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; offerNumber?: string };
    setBusy(false);
    if (j.ok) setDone(j.offerNumber ?? "sent");
    else setError(j.error ?? "Could not send that offer");
  };
  if (done)
    return (
      <p data-testid="offer-sent" className="border-l-2 border-ink py-2 pl-4 text-[14px]">
        Offer {done} sent to {providerName}. When they accept, it is added to your work request cart and you will be notified.
      </p>
    );
  return (
    <div data-testid="make-offer" className="flex flex-wrap items-end gap-3">
      <label className="text-[12px] font-semibold text-ink-2">
        Your offer ($)
        <input
          className="mt-1 block h-11 w-40 border border-line bg-surface px-3 text-[15px] outline-none focus:border-ink"
          inputMode="decimal"
          aria-label="Your offer"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={busy || !(Number(amount) > 0)}
        onClick={send}
        className="inline-flex min-h-11 items-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40"
      >
        {busy ? "Sending…" : "Make an Offer"}
      </button>
      {error && <p className="w-full text-[13px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
