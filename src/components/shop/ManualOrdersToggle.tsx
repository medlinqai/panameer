"use client";

import { useState } from "react";

// SH-E003: off by default — Shop orders open as soon as the buyer places them.
export function ManualOrdersToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const flip = async () => {
    setBusy(true);
    const r = await fetch("/api/provider/order-acceptance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manual: !on }) });
    if (r.ok) setOn(!on);
    setBusy(false);
  };
  return (
    <label data-manual-orders className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[13.5px]">
      <input type="checkbox" checked={on} disabled={busy} onChange={flip} className="mt-0.5 h-4 w-4 accent-ink" />
      <span>
        <b>I accept orders manually</b>
        <span className="block text-[12.5px] text-ink-2">{on ? "New orders wait for you to accept them." : "Off: orders open as soon as a buyer places them."}</span>
      </span>
    </label>
  );
}
