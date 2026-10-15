"use client";

import { useState } from "react";

// Lane 7 (Scott 10-15): "Open to offers on price and delivery" replaces "I accept orders manually". Orders at the list
// price and date always open at once; with this on, buyers can also propose a different price and/or delivery date.
export function ManualOrdersToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    setBusy(true);
    const r = await fetch("/api/provider/order-acceptance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ openToOffers: !on }) });
    if (r.ok) setOn(!on);
    setBusy(false);
  };
  return (
    <label data-open-to-offers-switch className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[13.5px]">
      <input type="checkbox" checked={on} disabled={busy} onChange={flip} className="mt-0.5 h-4 w-4 accent-ink" />
      <span>
        <b>Open to offers on price and delivery</b>
        <span className="block text-[12.5px] text-ink-2">{on ? "Buyers can propose a different price or date; you accept, counter once, or decline." : "Off: buyers buy at your price and date. You can still open single products or services to offers."}</span>
      </span>
    </label>
  );
}
