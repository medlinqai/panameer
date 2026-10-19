import type { JobStatus, ProposalStatus, PaymentRequestStatus, WorkOrderLineStatus, WorkOrderStatus, WorkRequestStatus } from "@prisma/client";

// One map from stored statuses to Oracle Cloud labels (2026-10-09). Stored values never change; screens read these.
// JW-E003: requisition statuses (Oracle POR). DRAFT/POSTED/ASSIGNED are pre-JW values kept for old rows.
export const WORK_REQUEST_LABEL: Record<WorkRequestStatus, string> = {
  INCOMPLETE: "Incomplete",
  SUBMITTED: "Submitted",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  ORDERED: "Ordered",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  CANCELLED: "Canceled",
  DRAFT: "Incomplete",
  POSTED: "Incomplete",
  ASSIGNED: "Incomplete",
};

export const JOB_LABEL: Record<JobStatus, string> = { DRAFT: "Draft", OPEN: "Active", CLOSED: "Closed", FILLED: "Hired", CANCELED: "Canceled" };

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

/** X-E006: a payment request on an ERP order, waiting on the requester in the ERP. */
export const ERP_PENDING_LABEL = "Sent to ERP · Pending Requester Approval";

/** O-E003: shown instead of Open while a change order waits on the provider. */
export const PENDING_CHANGE_LABEL = "Pending Change Acknowledgment";

export const WORK_ORDER_LINE_LABEL: Record<WorkOrderLineStatus, string> = {
  OPEN: "Open",
  DRAWN: "Closed for Invoicing",
  CLOSED: "Closed",
  CANCELLED: "Canceled",
  FINALLY_CLOSED: "Finally Closed",
};

export const SETTLEMENT_LABEL: Record<PaymentRequestStatus, string> = {
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

export const WORK_REQUEST_TONE: Record<WorkRequestStatus, string> = { INCOMPLETE: QUIET, SUBMITTED: WAIT, PENDING_APPROVAL: WAIT, APPROVED: LIVE, ORDERED: LIVE, RETURNED: WAIT, REJECTED: QUIET, WITHDRAWN: QUIET, CANCELLED: QUIET, DRAFT: QUIET, POSTED: QUIET, ASSIGNED: QUIET };
export const JOB_TONE: Record<JobStatus, string> = { DRAFT: QUIET, OPEN: LIVE, CLOSED: QUIET, FILLED: LIVE, CANCELED: QUIET };
export const WORK_ORDER_TONE: Record<WorkOrderStatus, string> = { DRAFT: QUIET, ISSUED: WAIT, ACCEPTED: WAIT, RELEASED: LIVE, ACTIVE: LIVE, CLOSED: QUIET, CANCELLED: QUIET, ON_HOLD: WAIT, FINALLY_CLOSED: QUIET };
export const SETTLEMENT_TONE: Record<PaymentRequestStatus, string> = { DRAFT: QUIET, SUBMITTED: WAIT, APPROVED: LIVE, REJECTED: "bg-rose-50 text-rose-700", PAID: LIVE };
