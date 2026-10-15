import type { JobStatus, WorkRequestStatus } from "@prisma/client";
import { JOB_LABEL, JOB_TONE, WORK_REQUEST_LABEL, WORK_REQUEST_TONE } from "@/lib/oracle-status";

export const WORK_REQUEST_STATUS_LABEL = WORK_REQUEST_LABEL;
export const WORK_REQUEST_STATUS_TONE = WORK_REQUEST_TONE;
export const JOB_STATUS_LABEL = JOB_LABEL;

export function workRequestStatusPillClass(status: WorkRequestStatus): string {
  return `rounded-full px-3 py-1 text-[12.5px] font-bold ${WORK_REQUEST_STATUS_TONE[status]}`;
}

export function jobStatusPillClass(status: JobStatus): string {
  return `rounded-full px-3 py-1 text-[12.5px] font-bold ${JOB_TONE[status]}`;
}
