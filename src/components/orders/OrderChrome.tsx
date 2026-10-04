import type { WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";

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

const TONE: Record<WorkOrderStatus, string> = {
  DRAFT: "bg-ink/[0.05] text-ink-2",
  ISSUED: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-sky-50 text-sky-700",
  RELEASED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-ink/[0.05] text-ink-2",
  CANCELLED: "bg-ink/[0.05] text-ink-2",
};

const LABEL: Record<WorkOrderStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  ACCEPTED: "Accepted",
  RELEASED: "Released",
  ACTIVE: "Active",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function StatusPill({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${TONE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
