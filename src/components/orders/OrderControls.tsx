"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderControl } from "@/lib/orders";

const BTN = "inline-flex min-h-11 items-center border border-ink bg-surface px-4 text-[14px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-40";
const BTN_K = "inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40";

const LABEL: Record<OrderControl, string> = {
  HOLD: "Hold",
  RELEASE_HOLD: "Release Hold",
  FREEZE: "Freeze",
  UNFREEZE: "Unfreeze",
  CLOSE: "Close",
  REOPEN: "Reopen",
  FINALLY_CLOSE: "Finally Close",
};

// O-E002: what each control does, shown in its confirm step.
const EFFECT: Record<OrderControl, string> = {
  HOLD: "No payment requests can be raised, approved or paid until you release the hold.",
  RELEASE_HOLD: "The order returns to the status it had before the hold.",
  FREEZE: "No change orders. Payment requests and payment carry on.",
  UNFREEZE: "Change orders are possible again.",
  CLOSE: "Payment requests for work done can still be submitted, approved and paid. You can reopen it.",
  REOPEN: "The order opens again.",
  FINALLY_CLOSE: "Permanent. Nothing further can be raised, approved or paid on this order.",
};

/** The customer's Oracle-style controls on a work order, each asking once before it acts. */
export function OrderControls({ orderId, controls, unusedLabel, pending }: { orderId: string; controls: OrderControl[]; unusedLabel: string; pending: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<OrderControl | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (controls.length === 0) return null;
  const run = async (action: OrderControl) => {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/orders/${orderId}/control`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (r.ok) {
      setConfirming(null);
      router.refresh();
    } else setError(j.error ?? "That didn't work.");
  };
  if (confirming)
    return (
      <div data-order-control={confirming} className="w-full border border-line bg-white p-4">
        <p className="text-[15px] font-bold">{LABEL[confirming]} this work order?</p>
        <p className="mt-1 text-[14px] text-ink-2">{EFFECT[confirming]}</p>
        {confirming === "FINALLY_CLOSE" && (
          <p className="mt-1 text-[14px] text-ink-2">
            {pending > 0 ? "Approve or reject the pending payment request first." : <>The unused balance of <b className="text-ink">{unusedLabel}</b> is released.</>}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={busy || (confirming === "FINALLY_CLOSE" && pending > 0)} onClick={() => run(confirming)} className={BTN_K}>
            {busy ? "Working…" : `Yes, ${LABEL[confirming]}`}
          </button>
          <button type="button" onClick={() => { setConfirming(null); setError(null); }} className="text-[14px] font-semibold underline">Cancel</button>
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-magenta-dark">{error}</p>}
      </div>
    );
  return (
    <span className="flex flex-wrap items-center gap-2">
      {controls.map((c) => (
        <button key={c} type="button" data-control={c} onClick={() => setConfirming(c)} className={BTN}>{LABEL[c]}</button>
      ))}
    </span>
  );
}
