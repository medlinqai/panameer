"use client";

import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/MeProvider";

// SH-E001: Buy Now (primary) · Add to Cart (secondary). Signed out → sign in → back to the cart with the product added.
export function BuyButtons({ productId, signedIn, size = "md" }: { productId: string; signedIn: boolean; size?: "sm" | "md" }) {
  const { refresh } = useMe();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primary = size === "sm" ? "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40" : "inline-flex min-h-11 items-center justify-center bg-ink px-6 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";
  const secondary = size === "sm" ? "inline-flex min-h-9 items-center justify-center border border-ink bg-surface px-4 text-[13px] font-semibold hover:bg-surface-hover disabled:opacity-40" : "inline-flex min-h-11 items-center justify-center border border-ink bg-surface px-6 text-[14px] font-semibold hover:bg-surface-hover disabled:opacity-40";
  if (!signedIn) {
    const back = (buy: boolean) => `/login?callbackUrl=${encodeURIComponent(`/cart?add=${productId}${buy ? "" : "&stay=1"}`)}`;
    return (
      <div data-buy-buttons className="flex flex-wrap items-center gap-2">
        <Link href={back(true)} className={primary}>Buy Now</Link>
        <Link href={back(false)} className={secondary}>Add to Cart</Link>
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
  return (
    <div data-buy-buttons className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={busy} onClick={() => add(true)} className={primary}>Buy Now</button>
      {added ? (
        <Link href="/cart" className={secondary}>Added · View Cart</Link>
      ) : (
        <button type="button" disabled={busy} onClick={() => add(false)} className={secondary}>Add to Cart</button>
      )}
      {error && <p role="alert" className="w-full text-[13px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
