"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { OrderControl } from "@/lib/orders";
import { OrderControls } from "@/components/orders/OrderControls";

// WT-E005: Actions ▾ (Oracle-style) — View Transaction History · View Change History · the order controls by role and status
// (Hold / Release · Close · Finally Close…, today's OrderControls rules with their confirm step on the page).
export function OrderActionsMenu({ orderId, controls, unusedLabel, pending }: { orderId: string; controls: OrderControl[]; unusedLabel: string; pending: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  const ITEM = "block w-full border-b border-line px-4 py-2.5 text-left text-[14px] font-semibold hover:bg-surface-hover";
  return (
    <div ref={box} className="relative" data-order-actions>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex min-h-9 items-center gap-1.5 border border-ink bg-white px-4 text-[13.5px] font-bold hover:bg-surface-hover">
        Actions <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-[300px] border border-line bg-white shadow-lg">
          <Link role="menuitem" href={`/orders/${orderId}?view=history`} onClick={() => setOpen(false)} className={ITEM}>View Transaction History</Link>
          <Link role="menuitem" href={`/orders/${orderId}?view=changes`} onClick={() => setOpen(false)} className={ITEM}>View Change History</Link>
          {controls.length > 0 && (
            <div className="p-3" data-order-action-controls>
              <OrderControls orderId={orderId} controls={controls} unusedLabel={unusedLabel} pending={pending} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
