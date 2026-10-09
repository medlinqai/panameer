import type { ProposalStatus, SettlementStatus, WorkOrderLineStatus, WorkOrderStatus, WorkRequestStatus } from "@prisma/client";

// One map from stored statuses to Oracle Cloud labels (2026-10-09). Stored values never change; screens read these.
export const WORK_REQUEST_LABEL: Record<WorkRequestStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Active",
  ASSIGNED: "Awarded",
  ORDERED: "Ordered",
  CANCELLED: "Canceled",
};

export const PROPOSAL_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  SHORTLISTED: "Shortlisted",
  WITHDRAWN: "Withdrawn",
  DECLINED: "Declined",
  AWARDED: "Awarded",
  NOT_SELECTED: "Not Awarded",
};

export const WORK_ORDER_LABEL: Record<WorkOrderStatus, string> = {
  DRAFT: "Incomplete",
  ISSUED: "Pending Acknowledgment",
  ACCEPTED: "Pending Acknowledgment",
  RELEASED: "Open",
  ACTIVE: "Open",
  CLOSED: "Closed",
  CANCELLED: "Canceled",
  ON_HOLD: "On Hold",
  FINALLY_CLOSED: "Finally Closed",
};

/** O-E003: shown instead of Open while a change order waits on the provider. */
export const PENDING_CHANGE_LABEL = "Pending Change Acknowledgment";

export const WORK_ORDER_LINE_LABEL: Record<WorkOrderLineStatus, string> = {
  OPEN: "Open",
  DRAWN: "Closed for Invoicing",
  CLOSED: "Closed",
  CANCELLED: "Canceled",
  FINALLY_CLOSED: "Finally Closed",
};

export const SETTLEMENT_LABEL: Record<SettlementStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

/** Who a Pending Acknowledgment order is waiting on, from the two acceptance stamps. */
export function waitingOn(o: { status: WorkOrderStatus; provider_accepted_at?: Date | string | null; buyer_accepted_at?: Date | string | null }): "PROVIDER" | "BUYER" | null {
  if (o.status !== "ISSUED" && o.status !== "ACCEPTED") return null;
  if (!o.provider_accepted_at) return "PROVIDER";
  if (!o.buyer_accepted_at) return "BUYER";
  return null;
}

// Pill tones: magenta = waiting on someone, ink = open/live, grey = finished or not started. No green.
const QUIET = "bg-ink/[0.05] text-ink-2";
const WAIT = "border border-magenta text-magenta-dark";
const LIVE = "bg-ink text-surface";

export const WORK_REQUEST_TONE: Record<WorkRequestStatus, string> = { DRAFT: QUIET, POSTED: LIVE, ASSIGNED: WAIT, ORDERED: LIVE, CANCELLED: QUIET };
export const WORK_ORDER_TONE: Record<WorkOrderStatus, string> = { DRAFT: QUIET, ISSUED: WAIT, ACCEPTED: WAIT, RELEASED: LIVE, ACTIVE: LIVE, CLOSED: QUIET, CANCELLED: QUIET, ON_HOLD: WAIT, FINALLY_CLOSED: QUIET };
export const SETTLEMENT_TONE: Record<SettlementStatus, string> = { DRAFT: QUIET, SUBMITTED: WAIT, APPROVED: LIVE, REJECTED: "bg-rose-50 text-rose-700", PAID: LIVE };
