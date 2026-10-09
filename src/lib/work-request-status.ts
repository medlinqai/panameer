import type { WorkRequestStatus } from "@prisma/client";
import { WORK_REQUEST_LABEL, WORK_REQUEST_TONE } from "@/lib/oracle-status";

export const WORK_REQUEST_STATUS_LABEL = WORK_REQUEST_LABEL;
export const WORK_REQUEST_STATUS_TONE = WORK_REQUEST_TONE;

export function workRequestStatusPillClass(status: WorkRequestStatus): string {
  return `rounded-full px-3 py-1 text-[12.5px] font-bold ${WORK_REQUEST_STATUS_TONE[status]}`;
}
