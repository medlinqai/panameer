import type { WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";
import { WORK_ORDER_LABEL, WORK_ORDER_TONE } from "@/lib/oracle-status";

export function OriginBadge({ origin }: { origin: WorkOrderOrigin }) {
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


export function StatusPill({ status, waiting }: { status: WorkOrderStatus; waiting?: string | null }) {
  return (
    <span className="inline-flex flex-col items-end">
      <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${WORK_ORDER_TONE[status]}`}>{WORK_ORDER_LABEL[status]}</span>
      {waiting && <span className="mt-1 text-[12px] text-ink-2">{waiting}</span>}
    </span>
  );
}
