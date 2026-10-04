"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Buyer-only: closing stops new payment requests; asks once before it does.
export function CloseOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = async () => {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/orders/${orderId}/close`, { method: "POST" });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(j.error ?? "Could not close this work order");
  };
  if (!confirming)
    return (
      <button type="button" className="inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover" onClick={() => setConfirming(true)}>
        Close Work Order
      </button>
    );
  return (
    <span className="flex flex-wrap items-center gap-3">
      <span className="text-[14px] text-ink-2">No more payment requests can be raised. Close it?</span>
      <button type="button" disabled={busy} className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40" onClick={close}>
        {busy ? "Closing…" : "Yes, Close It"}
      </button>
      <button type="button" className="text-[14px] font-semibold underline" onClick={() => setConfirming(false)}>Cancel</button>
      {error && <span className="w-full text-[13px] font-semibold text-red-700">{error}</span>}
    </span>
  );
}
