"use client";

import { useState } from "react";
import { WoPlanStart } from "@/components/orders/WoPlanStart";

// Board 3 "Add a plan": converts a T&E order in place; timesheets and payments are untouched.
export function WoAddPlan({ orderId, copyable }: { orderId: string; copyable: { id: string; number: string }[] }) {
  const [open, setOpen] = useState(false);
  if (open) return <WoPlanStart orderId={orderId} copyable={copyable} withTe={false} />;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-6 inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover"
    >
      Add a Plan
    </button>
  );
}
