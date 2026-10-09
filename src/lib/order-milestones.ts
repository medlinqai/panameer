import { prisma } from "@/lib/prisma";
import { createSettlement, SettlementError } from "@/lib/settlements";
import type { PaymentTrigger } from "@prisma/client";
import type { Viewer } from "@/lib/access";

// CAT-E007: product triggers — a line's milestones are reported (Delivered / Installed / Downloaded…) to raise each payment request.
const PRODUCT_TRIGGERS: PaymentTrigger[] = ["ACCEPTANCE", "DOWNLOAD", "INSTALLATION", "ORDER_ACCEPTED"];

export const REPORT_LABEL: Record<PaymentTrigger, string> = {
  DOWNLOAD: "Report Downloaded",
  INSTALLATION: "Report Installed",
  ACCEPTANCE: "Report Delivered",
  ORDER_ACCEPTED: "Request Kickoff Payment",
  PAYMENT_REQUEST: "Request Payment",
  TIMESHEET: "Submit Timesheet",
  INVOICE: "Request Payment",
};

/** Copies each amount line's schedule onto the order: the product's milestones, else one 100% milestone on its trigger. */
export async function snapshotMilestones(orderId: string) {
  const lines = await prisma.workOrderLine.findMany({ where: { work_order_id: orderId, transaction_type: "SERVICE_BY_AMT" } });
  const reqLines = await prisma.workRequestLine.findMany({ where: { id: { in: lines.map((l) => l.work_request_line_id).filter((x): x is string => !!x) } }, select: { id: true, service_product_id: true } });
  const productOf = new Map(reqLines.map((r) => [r.id, r.service_product_id]));
  const products = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: reqLines.map((r) => r.service_product_id).filter((x): x is string => !!x) } }, select: { id: true, kind: true, payment_trigger: true, milestones: { orderBy: { sequence: "asc" } } } })).map((p) => [p.id, p]));
  for (const l of lines) {
    const p = l.work_request_line_id ? products.get(productOf.get(l.work_request_line_id) ?? "") : undefined;
    let rows: { label: string; percent: number; trigger: PaymentTrigger }[] = [];
    if (p) {
      if (p.kind === "BLANKET" || p.kind === "DEPLOYABLE") continue;
      const fallback = p.payment_trigger && PRODUCT_TRIGGERS.includes(p.payment_trigger) ? p.payment_trigger : "ACCEPTANCE";
      rows = p.milestones.length ? p.milestones.map((m) => ({ label: m.label, percent: m.percent, trigger: m.trigger ?? fallback })) : [{ label: "In full", percent: 100, trigger: fallback }];
    } else if (l.payment_trigger && PRODUCT_TRIGGERS.includes(l.payment_trigger)) {
      rows = [{ label: "In full", percent: 100, trigger: l.payment_trigger }];
    }
    if (rows.length) await prisma.workOrderMilestone.createMany({ data: rows.map((r, i) => ({ work_order_line_id: l.id, sequence: i + 1, ...r })), skipDuplicates: true });
  }
}

export type MilestoneView = { id: string; sequence: number; label: string; percent: number; trigger: PaymentTrigger; amountCents: number; reportedAt: string | null; settlementId: string | null; action: string };

export async function milestonesFor(lineIds: string[]): Promise<Map<string, MilestoneView[]>> {
  const rows = await prisma.workOrderMilestone.findMany({ where: { work_order_line_id: { in: lineIds } }, orderBy: { sequence: "asc" } });
  const lines = new Map((await prisma.workOrderLine.findMany({ where: { id: { in: lineIds } }, select: { id: true, amount_cents: true } })).map((l) => [l.id, l.amount_cents ?? 0]));
  const out = new Map<string, MilestoneView[]>();
  for (const m of rows) {
    const list = out.get(m.work_order_line_id) ?? [];
    list.push({ id: m.id, sequence: m.sequence, label: m.label, percent: m.percent, trigger: m.trigger, amountCents: Math.round(((lines.get(m.work_order_line_id) ?? 0) * m.percent) / 100), reportedAt: m.reported_at?.toISOString().slice(0, 10) ?? null, settlementId: m.settlement_request_id, action: REPORT_LABEL[m.trigger] });
    out.set(m.work_order_line_id, list);
  }
  return out;
}

/** The provider reports a milestone → the payment request for its share (due = report date + terms; ERP orders queue the work confirmation). */
export async function reportMilestone(viewer: Viewer, milestoneId: string) {
  const m = await prisma.workOrderMilestone.findUnique({ where: { id: milestoneId } });
  if (!m) throw new SettlementError("Milestone not found", "NOT_FOUND");
  if (m.reported_at) throw new SettlementError("This milestone has already been reported", "INVALID");
  const line = await prisma.workOrderLine.findUniqueOrThrow({ where: { id: m.work_order_line_id }, include: { workOrder: { select: { id: true, period_start: true, period_end: true } } } });
  const all = await prisma.workOrderMilestone.findMany({ where: { work_order_line_id: line.id }, orderBy: { sequence: "asc" } });
  const amount = line.amount_cents ?? 0;
  // The last milestone takes whatever rounding left, so the line is drawn exactly in full.
  const open = all.filter((x) => !x.reported_at);
  const share = open.length === 1 ? amount - (line.drawn_amount_cents ?? 0) : Math.round((amount * m.percent) / 100);
  const day = new Date();
  const o = line.workOrder;
  const clamp = (d: Date) => (o.period_start && d < o.period_start ? o.period_start : o.period_end && d > o.period_end ? o.period_end : d);
  const at = clamp(day).toISOString().slice(0, 10);
  const claimed = await prisma.workOrderMilestone.updateMany({ where: { id: m.id, reported_at: null }, data: { reported_at: day } });
  if (!claimed.count) throw new SettlementError("This milestone has already been reported", "INVALID");
  try {
    const s = await createSettlement(viewer, o.id, { periodStart: at, periodEnd: at, lines: [{ workOrderLineId: line.id, amountCents: share, note: `${m.label} · ${REPORT_LABEL[m.trigger].replace(/^Report /, "")}` }] });
    await prisma.workOrderMilestone.update({ where: { id: m.id }, data: { settlement_request_id: s.id } });
    return s;
  } catch (e) {
    await prisma.workOrderMilestone.update({ where: { id: m.id }, data: { reported_at: null } });
    throw e;
  }
}
