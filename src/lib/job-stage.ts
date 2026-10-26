import { prisma } from "@/lib/prisma";
import type { UiState } from "@/components/hire/HireUI";

// JS-E001 / JR-E001: one buyer-facing job status, derived from data in one place. DB FILLED → Filled, OPEN → Active.
export type JobStage = "DRAFT" | "ACTIVE" | "COMPARING" | "REQUEST_TO_HIRE" | "FILLED" | "ON_HOLD" | "CLOSED";
export const JOB_STAGE_LABEL: Record<JobStage, string> = { DRAFT: "Draft", ACTIVE: "Active", COMPARING: "Comparing", REQUEST_TO_HIRE: "Request to Hire", FILLED: "Filled", ON_HOLD: "On Hold", CLOSED: "Closed" };
export const JOB_STAGE_STATE: Record<JobStage, UiState> = { DRAFT: "inactive", ACTIVE: "inactive", COMPARING: "pending", REQUEST_TO_HIRE: "pending", FILLED: "accepted", ON_HOLD: "inactive", CLOSED: "inactive" };
export const JOB_STAGE_ORDER: JobStage[] = ["ACTIVE", "COMPARING", "REQUEST_TO_HIRE", "ON_HOLD", "FILLED", "CLOSED", "DRAFT"];
export type JobOrigin = "Hire Directly" | "Compare Providers" | "From ERP" | null;

const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD", "CLOSED", "FINALLY_CLOSED"]);
const DECLINED_WR = new Set(["REJECTED", "WITHDRAWN", "CANCELLED"]);
type Facts = { status: string; asked: boolean; eventOpen?: boolean; requestOpen: boolean; orderReleased: boolean; orderExists: boolean; inErpCart?: boolean };

/** The pure rule. Request to Hire = a Request not yet Approved or Declined; Filled = its Order is released. */
export function jobStage(f: Facts): JobStage {
  // A job whose providers were asked straight from Create stays DRAFT in data — it is Comparing to the buyer.
  if (f.status === "DRAFT" && !f.asked) return "DRAFT";
  if (f.status === "ON_HOLD") return "ON_HOLD";
  if (f.status === "CLOSED" || f.status === "CANCELED") return "CLOSED";
  if (f.orderReleased || f.status === "FILLED") return "FILLED";
  if (f.requestOpen || f.inErpCart || f.orderExists) return "REQUEST_TO_HIRE";
  // A declined Request falls back here: Comparing while the Sourcing Event is still open, else Active.
  if (f.asked && f.eventOpen !== false) return "COMPARING";
  return "ACTIVE";
}

/** Stages (and origin tags) for many jobs at once. */
export async function jobStages(jobIds: string[]): Promise<Map<string, { stage: JobStage; origin: JobOrigin }>> {
  const ids = [...new Set(jobIds)];
  if (!ids.length) return new Map();
  const [jobs, events, wrs, orders, cartLines] = await Promise.all([
    prisma.job.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } }),
    prisma.sourcingEvent.findMany({ where: { job_id: { in: ids }, status: { not: "DRAFT" } }, select: { job_id: true, status: true } }),
    prisma.workRequest.findMany({ where: { job_id: { in: ids } }, select: { job_id: true, status: true, erp_connection_id: true, erp_returned_at: true, lines: { where: { provider_person_id: { not: null }, status: { in: ["ASSIGNED", "ORDERED"] } }, select: { id: true } } } }),
    prisma.workOrder.findMany({ where: { workRequest: { job_id: { in: ids } }, status: { not: "CANCELLED" } }, select: { status: true, workRequest: { select: { job_id: true } } } }),
    // PI-E004: a hire sitting in a punch-in cart (punchout_line_ref job:{id}:…) — the Job waits on the ERP.
    prisma.workRequestLine.findMany({ where: { OR: ids.map((i) => ({ punchout_line_ref: { startsWith: `job:${i}:` } })), work_order_id: null, workRequest: { erp_connection_id: { not: null }, status: { in: ["INCOMPLETE", "PENDING_APPROVAL"] } } }, select: { punchout_line_ref: true } }),
  ]);
  const out = new Map<string, { stage: JobStage; origin: JobOrigin }>();
  for (const j of jobs) {
    const w = wrs.filter((x) => x.job_id === j.id);
    const o = orders.filter((x) => x.workRequest?.job_id === j.id);
    const asked = events.some((e) => e.job_id === j.id);
    const awarded = w.some((x) => x.lines.length > 0);
    const erpOrigin = w.some((x) => !!x.erp_connection_id);
    const requestOpen = w.some((x) => (x.lines.length > 0 || !!x.erp_returned_at) && !DECLINED_WR.has(x.status) && x.status !== "ORDERED");
    const eventOpen = events.some((e) => e.job_id === j.id && e.status === "OPEN");
    out.set(j.id, {
      stage: jobStage({ status: j.status, asked, eventOpen, requestOpen, orderReleased: o.some((x) => RELEASED.has(x.status)), orderExists: o.length > 0, inErpCart: cartLines.some((l) => !!l.punchout_line_ref?.startsWith(`job:${j.id}:`)) }),
      origin: erpOrigin ? "From ERP" : asked ? "Compare Providers" : awarded ? "Hire Directly" : null,
    });
  }
  return out;
}
