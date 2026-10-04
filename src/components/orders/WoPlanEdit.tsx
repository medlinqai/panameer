"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlanOutlineEditor } from "@/components/plan/PlanOutlineEditor";
import type { EditorRow } from "@/lib/plan/editor-row";

// "Edit plan": the same outline editor as the build plan, saving to this order's plan.
export function WoPlanEdit({ orderId, rows }: { orderId: string; rows: EditorRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => {
          if (open) router.refresh();
          setOpen(!open);
        }}
        className="inline-flex min-h-11 items-center border border-ink bg-surface px-5 text-[14px] font-semibold text-ink hover:bg-surface-hover"
      >
        {open ? "Done Editing" : "Edit Plan"}
      </button>
      {open && (
        <div className="mt-4" data-testid="wo-plan-editor">
          <PlanOutlineEditor ownerKey={`wo:${orderId}`} endpoint={`/api/orders/${orderId}/plan`} rows={rows} />
        </div>
      )}
    </div>
  );
}
