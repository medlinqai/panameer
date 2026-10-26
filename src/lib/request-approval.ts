import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify, resolveNotifications } from "@/lib/notifications";

// JR-E004: Request approval — decline (with a reason) and the 60-day PO rule for Requests waiting on the ERP.
export const ASSUMED_DECLINED = "Assumed Declined — No PO in 60 Days";
const DAY = 86_400_000;
export const PO_NOTICE_DAY = 45;
export const PO_LIMIT_DAY = 60;

type Clock = { erp_wait_reset_at: Date | null; erp_wait_started_at: Date | null; erp_returned_at: Date | null; submitted_at?: Date | null };
const clockOf = (w: Clock) => w.erp_wait_reset_at ?? w.erp_wait_started_at ?? w.erp_returned_at ?? w.submitted_at ?? null;
/** Day n of 60 since the cart was returned (or since Still Waiting reset the clock). */
export function erpWaitDay(w: Clock, now = new Date()): number | null {
  const at = clockOf(w);
  return at ? Math.max(1, Math.floor((now.getTime() - at.getTime()) / DAY) + 1) : null;
}

async function ownRequest(viewer: Viewer, id: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const wr = await prisma.workRequest.findUnique({ where: { id }, select: { id: true, buyer_person_id: true, status: true, approval_status: true, erp_wait_reset_at: true, wr_number: true, job_id: true } });
  if (!me || !wr || wr.buyer_person_id !== me.id) throw new Error("That Request isn't yours.");
  return wr;
}

/** Declined → the Job falls back to Active (or Comparing while its Sourcing Event is open). A later PO still creates the Order. */
export async function declineRequest(id: string, reason: string) {
  const why = reason.trim().slice(0, 300);
  if (!why) throw new Error("Give a reason for the decline.");
  await prisma.$transaction([
    prisma.workRequest.update({ where: { id }, data: { status: "REJECTED", approval_status: "DECLINED", declined_reason: why } }),
    prisma.workRequestLine.updateMany({ where: { work_request_id: id, work_order_id: null, status: "ASSIGNED" }, data: { status: "CANCELLED" } }),
  ]);
  await resolveNotifications({ dedupe_key: { startsWith: `work.request_po_check:${id}` } });
}

export async function declineMyRequest(viewer: Viewer, id: string, reason: string) {
  const wr = await ownRequest(viewer, id);
  if (wr.approval_status === "DECLINED" || ["ORDERED", "APPROVED", "REJECTED"].includes(wr.status)) throw new Error("This Request is no longer waiting.");
  await declineRequest(id, reason);
}

/** Still Waiting resets the 60-day clock — once. */
export async function stillWaiting(viewer: Viewer, id: string) {
  const wr = await ownRequest(viewer, id);
  if (wr.erp_wait_reset_at) throw new Error("The clock was already reset once.");
  await prisma.workRequest.update({ where: { id }, data: { erp_wait_reset_at: new Date(), erp_wait_notice_at: null } });
  await resolveNotifications({ dedupe_key: { startsWith: `work.request_po_check:${id}` } });
}

/** Daily: day 45 → "No PO Yet — Still Coming?"; day 60 → Declined (Assumed). */
export async function runPoWait(now = new Date(), opts: { dry?: boolean } = {}) {
  const rows = await prisma.workRequest.findMany({
    where: { approval_status: "PENDING", approval_channel: "ERP", status: { notIn: ["ORDERED", "REJECTED", "APPROVED"] } },
    select: { id: true, wr_number: true, job_id: true, buyer_person_id: true, erp_wait_reset_at: true, erp_wait_started_at: true, erp_returned_at: true, erp_wait_notice_at: true },
  });
  const noticed: string[] = [];
  const declined: string[] = [];
  for (const w of rows) {
    const d = erpWaitDay(w, now);
    if (d == null) continue;
    if (d > PO_LIMIT_DAY) {
      declined.push(w.wr_number ?? w.id);
      if (!opts.dry) {
        await declineRequest(w.id, ASSUMED_DECLINED);
        await notify({ event: "work.request_declined", personId: w.buyer_person_id, entityType: "work_request", entityId: w.id, dedupeKey: `work.request_declined:${w.id}`, vars: { wrNumber: w.wr_number ?? "", reason: ASSUMED_DECLINED, jobId: w.job_id ?? "" } });
      }
    } else if (d >= PO_NOTICE_DAY && !w.erp_wait_notice_at) {
      noticed.push(w.wr_number ?? w.id);
      if (!opts.dry) {
        await prisma.workRequest.update({ where: { id: w.id }, data: { erp_wait_notice_at: now } });
        await notify({ event: "work.request_po_check", personId: w.buyer_person_id, entityType: "work_request", entityId: w.id, dedupeKey: `work.request_po_check:${w.id}${w.erp_wait_reset_at ? ":2" : ""}`, vars: { wrNumber: w.wr_number ?? "", day: d, jobId: w.job_id ?? "" } });
      }
    }
  }
  return { checked: rows.length, noticed, declined };
}
