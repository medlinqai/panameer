// JR-E003/E004: one status word for a Request (RQ-) — Pending Approval · Waiting on ERP · Approved · Declined. "Active" = the first two.
export type RequestStatus = "PENDING_APPROVAL" | "WAITING_ERP" | "APPROVED" | "DECLINED";
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = { PENDING_APPROVAL: "Pending Approval", WAITING_ERP: "Waiting on ERP", APPROVED: "Approved", DECLINED: "Declined" };
export const REQUEST_ACTIVE: RequestStatus[] = ["PENDING_APPROVAL", "WAITING_ERP"];

type Wr = { status: string; erp_connection_id?: string | null; erp_returned_at?: Date | null; approval_status?: string | null; approval_channel?: string | null };

/** null = not requested yet (a Shop cart or a draft). */
export function requestStatus(w: Wr): RequestStatus | null {
  if (w.approval_status === "DECLINED" || ["REJECTED", "WITHDRAWN"].includes(w.status)) return "DECLINED";
  if (w.approval_status === "APPROVED" || ["APPROVED", "ORDERED"].includes(w.status)) return "APPROVED";
  const erp = w.approval_channel === "ERP" || !!w.erp_connection_id || !!w.erp_returned_at;
  if (w.approval_status === "PENDING") return erp ? "WAITING_ERP" : "PENDING_APPROVAL";
  if (["SUBMITTED", "PENDING_APPROVAL"].includes(w.status)) return erp ? "WAITING_ERP" : "PENDING_APPROVAL";
  if (w.status === "INCOMPLETE" && erp) return "WAITING_ERP";
  return null;
}
