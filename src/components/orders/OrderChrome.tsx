import type { WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";
import { PENDING_CHANGE_LABEL, WORK_ORDER_LABEL, WORK_ORDER_TONE } from "@/lib/oracle-status";

export function OriginBadge({ origin, erpRef }: { origin: WorkOrderOrigin; erpRef?: string | null }) {
  if (erpRef !== undefined && erpRef !== null)
    return <span data-erp-badge className="rounded-full border border-ink px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em]">From ERP · PO {erpRef}</span>;
  if (origin !== "DIRECT") return null;
  return (
    <span
      className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-2"
      title="Agreed outside Panameer and brought in — Panameer records this order rather than issuing it."
    >
      {}
      Externally Sourced
    </span>
  );
}


export function StatusPill({ status, waiting, frozen, pendingChange }: { status: WorkOrderStatus; waiting?: string | null; frozen?: boolean; pendingChange?: boolean }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${pendingChange ? WORK_ORDER_TONE.ISSUED : WORK_ORDER_TONE[status]}`}>{pendingChange ? PENDING_CHANGE_LABEL : WORK_ORDER_LABEL[status]}{frozen ? " · Frozen" : ""}</span>
      {waiting && <span className="mt-1 text-[12px] text-ink-2">{waiting}</span>}
    </span>
  );
}
