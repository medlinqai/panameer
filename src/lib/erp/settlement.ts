import { prisma } from "@/lib/prisma";
import { adapterFor } from "@/lib/erp/adapter";
import { erpSendEnabled, logMessage } from "@/lib/erp/connections";
import { queueOutbound } from "@/lib/erp/outbound";
import { payloadId } from "@/lib/erp/cxml";

// X-E006: a payment request on an ERP order becomes a receipt in the ERP (Oracle: a work confirmation) for the requester's approval.
export async function queueWorkConfirmation(settlementId: string) {
  const s = await prisma.settlementRequest.findUnique({ where: { id: settlementId }, include: { lines: true } });
  if (!s) return null;
  const o = await prisma.workOrder.findUnique({ where: { id: s.work_order_id }, include: { lines: true } });
  if (!o?.erp_connection_id || !o.external_ref) return null;
  const conn = await prisma.erpConnection.findUnique({ where: { id: o.erp_connection_id } });
  if (!conn) return null;
  const poLine = new Map(o.lines.map((l) => [l.id, l.external_line_ref]));
  const body = adapterFor(conn).buildReceipt({
    poNumber: o.external_ref,
    requestNumber: s.settlement_number,
    periodStart: s.period_start.toISOString().slice(0, 10),
    periodEnd: s.period_end.toISOString().slice(0, 10),
    submittedAt: (s.submitted_at ?? new Date()).toISOString(),
    lines: s.lines.map((l) => ({
      poLineNumber: poLine.get(l.work_order_line_id) ?? null,
      description: l.description ?? "",
      quantity: l.basis === "RATE" ? Number(l.quantity ?? 0) : null,
      uom: l.uom,
      amountCents: l.basis === "RATE" ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0,
    })),
  });
  return queueOutbound({ connectionId: conn.id, type: "WORK_CONFIRMATION", body, payloadId: `wc-${s.settlement_number}-${Date.now()}`, workOrderId: o.id, settlementRequestId: s.id });
}

/** Mirrors the ERP's answer back (Approved / Rejected). Does nothing while sending is off. */
export async function pollWorkConfirmations(onRejected: (settlementId: string) => Promise<void>): Promise<{ checked: number; changed: number; skipped?: string }> {
  if (!erpSendEnabled()) return { checked: 0, changed: 0, skipped: "ERP sending is off" };
  const sent = await prisma.erpMessage.findMany({ where: { type: "WORK_CONFIRMATION", direction: "OUT", status: "SENT", external_id: { not: null }, settlement_request_id: { not: null } }, take: 200 });
  let changed = 0;
  for (const m of sent) {
    const s = await prisma.settlementRequest.findUnique({ where: { id: m.settlement_request_id! }, select: { id: true, status: true } });
    if (!s || s.status !== "SUBMITTED") continue;
    const conn = await prisma.erpConnection.findUnique({ where: { id: m.connection_id } });
    if (!conn?.active) continue;
    const r = await adapterFor(conn).pollStatus(conn, m.external_id!);
    if (r.status !== "APPROVED" && r.status !== "REJECTED") continue;
    const done = await prisma.settlementRequest.updateMany({
      where: { id: s.id, status: "SUBMITTED" },
      data: r.status === "APPROVED" ? { status: "APPROVED", decided_at: new Date() } : { status: "REJECTED", decided_at: new Date(), decision_note: r.note ?? "Rejected in the ERP" },
    });
    if (done.count && r.status === "REJECTED") await onRejected(s.id);
    if (done.count) {
      changed++;
      await logMessage({ connectionId: conn.id, direction: "IN", type: "STATUS_POLL", payloadId: payloadId(), status: "PROCESSED", body: JSON.stringify({ workConfirmationId: m.external_id, status: r.status }), settlementRequestId: s.id, workOrderId: m.work_order_id });
    }
  }
  return { checked: sent.length, changed };
}
