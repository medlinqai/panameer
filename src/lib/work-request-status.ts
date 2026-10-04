import type { WorkRequestStatus } from "@prisma/client";

export const WORK_REQUEST_STATUS_LABEL: Record<WorkRequestStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  ASSIGNED: "Provider Selected",
  ORDERED: "Under Contract",
  CANCELLED: "Cancelled",
};

export const WORK_REQUEST_STATUS_TONE: Record<WorkRequestStatus, string> = {
  DRAFT: "bg-ink/[0.05] text-ink-2",
  POSTED: "bg-emerald-50 text-emerald-700",
  ASSIGNED: "bg-emerald-50 text-emerald-700",
  ORDERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-ink/[0.05] text-ink-2",
};

export function workRequestStatusPillClass(status: WorkRequestStatus): string {
  return `rounded-full px-3 py-1 text-[12.5px] font-bold ${WORK_REQUEST_STATUS_TONE[status]}`;
}
