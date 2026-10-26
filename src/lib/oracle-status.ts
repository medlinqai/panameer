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

export const JOB_LABEL: Record<JobStatus, string> = { DRAFT: "Draft", OPEN: "Active", CLOSED: "Closed", FILLED: "Filled", CANCELED: "Canceled", ON_HOLD: "On Hold" };

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
  ISSUED: "Pending Acceptance",
  ACCEPTED: "Pending Acceptance",
  RELEASED: "Released",
  ACTIVE: "Open",
  CLOSED: "Closed",
  CANCELLED: "Canceled",
  ON_HOLD: "On Hold",
  FINALLY_CLOSED: "Finally Closed",
};

/** X-E006: a payment request on an ERP order, waiting on the requester in the ERP. */
export const ERP_PENDING_LABEL = "Sent to ERP · Pending Requester Approval";

/** O-E003: shown instead of Open while a change order waits on the provider. */
export const PENDING_CHANGE_LABEL = "Pending Change Acceptance";

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

/** WA-E002: who a pending order is waiting on — the buyer accepts first, then the provider. (An older order the provider
 *  already accepted — status ACCEPTED — still waits on the buyer.) */
export function waitingOn(o: { status: WorkOrderStatus; provider_accepted_at?: Date | string | null; buyer_accepted_at?: Date | string | null }): "PROVIDER" | "BUYER" | null {
  if (o.status !== "ISSUED" && o.status !== "ACCEPTED") return null;
  if (!o.buyer_accepted_at) return "BUYER";
  if (!o.provider_accepted_at) return "PROVIDER";
  return null;
}
export const PENDING_ON_LABEL = { BUYER: "Pending Buyer Acceptance", PROVIDER: "Pending Provider Acceptance" } as const;

// Pill tones: magenta = waiting on someone, ink = open/live, grey = finished or not started. No green.
// HB-E002: status pills are never magenta — brand state colours (inactive · pending · accepted).
const QUIET = "bg-state-inactive-bg text-state-inactive";
const WAIT = "bg-state-pending-bg text-state-pending";
const LIVE = "bg-state-accepted-bg text-state-accepted";

export const WORK_REQUEST_TONE: Record<WorkRequestStatus, string> = { INCOMPLETE: QUIET, SUBMITTED: WAIT, PENDING_APPROVAL: WAIT, APPROVED: LIVE, ORDERED: LIVE, RETURNED: WAIT, REJECTED: QUIET, WITHDRAWN: QUIET, CANCELLED: QUIET, DRAFT: QUIET, POSTED: QUIET, ASSIGNED: QUIET };
export const JOB_TONE: Record<JobStatus, string> = { DRAFT: QUIET, OPEN: LIVE, CLOSED: QUIET, FILLED: LIVE, CANCELED: QUIET, ON_HOLD: QUIET };
export const WORK_ORDER_TONE: Record<WorkOrderStatus, string> = { DRAFT: QUIET, ISSUED: WAIT, ACCEPTED: WAIT, RELEASED: LIVE, ACTIVE: LIVE, CLOSED: QUIET, CANCELLED: QUIET, ON_HOLD: WAIT, FINALLY_CLOSED: QUIET };
export const SETTLEMENT_TONE: Record<PaymentRequestStatus, string> = { DRAFT: QUIET, SUBMITTED: WAIT, APPROVED: LIVE, REJECTED: "bg-state-declined-bg text-state-declined", PAID: LIVE };
