import { prisma } from "@/lib/prisma";
import type { UiState } from "@/components/hire/HireUI";

// JS-E001: one buyer-facing job status, derived from data in one place (Job page pill, Jobs rows, slice chips).
export type JobStage = "DRAFT" | "OPEN" | "COMPARING" | "HIRED" | "WAITING_ERP" | "ON_HOLD" | "CLOSED" | "COMPLETED";
export const JOB_STAGE_LABEL: Record<JobStage, string> = { DRAFT: "Draft", OPEN: "Open", COMPARING: "Comparing", HIRED: "Hired", WAITING_ERP: "Waiting on ERP", ON_HOLD: "On Hold", CLOSED: "Closed", COMPLETED: "Completed" };
export const JOB_STAGE_STATE: Record<JobStage, UiState> = { DRAFT: "inactive", OPEN: "inactive", COMPARING: "pending", HIRED: "accepted", WAITING_ERP: "pending", ON_HOLD: "inactive", CLOSED: "inactive", COMPLETED: "accepted" };
export const JOB_STAGE_ORDER: JobStage[] = ["OPEN", "COMPARING", "HIRED", "WAITING_ERP", "ON_HOLD", "COMPLETED", "CLOSED", "DRAFT"];
export type JobOrigin = "Hire Directly" | "Compare Providers" | "From ERP" | null;

const RELEASED = new Set(["RELEASED", "ACTIVE", "ON_HOLD", "CLOSED", "FINALLY_CLOSED"]);
type Facts = { status: string; asked: boolean; awarded: boolean; erpReturned: boolean; erpOrigin: boolean; orderReleased: boolean; orderExists: boolean };

/** The pure rule. Closed = stopped early; Completed = finished normally (its Order is released). */
export function jobStage(f: Facts): JobStage {
  // A job whose providers were asked straight from Create stays DRAFT in data — it is Comparing to the buyer.
  if (f.status === "DRAFT" && !f.asked) return "DRAFT";
  if (f.status === "ON_HOLD") return "ON_HOLD";
  if (f.status === "CLOSED" || f.status === "CANCELED") return "CLOSED";
  if (f.orderReleased || f.status === "FILLED") return "COMPLETED";
  if (f.erpReturned && !f.orderExists) return "WAITING_ERP";
  if (f.awarded || f.orderExists) return "HIRED";
  if (f.asked) return "COMPARING";
  return "OPEN";
}

/** Stages (and origin tags) for many jobs at once. */
export async function jobStages(jobIds: string[]): Promise<Map<string, { stage: JobStage; origin: JobOrigin }>> {
  const ids = [...new Set(jobIds)];
  if (!ids.length) return new Map();
  const [jobs, events, wrs, orders] = await Promise.all([
    prisma.job.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } }),
    prisma.sourcingEvent.findMany({ where: { job_id: { in: ids }, status: { not: "DRAFT" } }, select: { job_id: true } }),
    prisma.workRequest.findMany({ where: { job_id: { in: ids } }, select: { job_id: true, erp_connection_id: true, erp_returned_at: true, lines: { where: { provider_person_id: { not: null }, status: { in: ["ASSIGNED", "ORDERED"] } }, select: { id: true } } } }),
    prisma.workOrder.findMany({ where: { workRequest: { job_id: { in: ids } }, status: { not: "CANCELLED" } }, select: { status: true, workRequest: { select: { job_id: true } } } }),
  ]);
  const out = new Map<string, { stage: JobStage; origin: JobOrigin }>();
  for (const j of jobs) {
    const w = wrs.filter((x) => x.job_id === j.id);
    const o = orders.filter((x) => x.workRequest?.job_id === j.id);
    const asked = events.some((e) => e.job_id === j.id);
    const awarded = w.some((x) => x.lines.length > 0);
    const erpOrigin = w.some((x) => !!x.erp_connection_id);
    out.set(j.id, {
      stage: jobStage({ status: j.status, asked, awarded, erpReturned: w.some((x) => !!x.erp_returned_at), erpOrigin, orderReleased: o.some((x) => RELEASED.has(x.status)), orderExists: o.length > 0 }),
      origin: erpOrigin ? "From ERP" : asked ? "Compare Providers" : awarded ? "Hire Directly" : null,
    });
  }
  return out;
}
