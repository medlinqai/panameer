import { prisma } from "@/lib/prisma";
import { PAYMENT_EVENT_LABEL } from "@/lib/billing-terms";

// SA-E008: In Process · Recurring · Completed · All on every Shop and Hire list tab.
export type Slice = "process" | "recurring" | "completed" | "all";
export const SLICES: { key: Slice; label: string }[] = [
  { key: "process", label: "In Process" }, { key: "recurring", label: "Recurring" }, { key: "completed", label: "Completed" }, { key: "all", label: "All" },
];
export const sliceOf = (raw: string | undefined): Slice => (SLICES.some((s) => s.key === raw) ? (raw as Slice) : "process");
export type Sliced = { completed: boolean; recurring: Recurring | null };
export type Recurring = { next: string; event: string; amountCents: number; orderId: string; paused: boolean };

export function inSlice(row: Sliced, slice: Slice) {
  return slice === "all" ? true : slice === "completed" ? row.completed : slice === "recurring" ? !!row.recurring : !row.completed;
}
export function sliceCounts(rows: Sliced[]) {
  return { process: rows.filter((r) => !r.completed).length, recurring: rows.filter((r) => r.recurring).length, completed: rows.filter((r) => r.completed).length, all: rows.length };
}

const CLOSED = ["CLOSED", "FINALLY_CLOSED", "CANCELLED"];
const LIVE = ["RELEASED", "ACTIVE", "ON_HOLD"];
const STEP: Record<string, number> = { WEEKLY: 7, BIWEEKLY: 14, EVERY_90_DAYS: 90 };

/** Per Work Order: closed? and, for a retainer / weekly service / subscription product, the next occurrence. */
export async function orderSlices(orderIds: string[]): Promise<Map<string, Sliced>> {
  if (!orderIds.length) return new Map();
  const orders = await prisma.workOrder.findMany({ where: { id: { in: orderIds } }, select: { id: true, status: true, period_start: true, created_at: true, lines: { select: { uom: true, billing_cycle: true, payment_event: true, unit_price_cents: true, amount_cents: true, quantity: true, service_product_id: true } } } });
  const subs = new Set((await prisma.serviceProduct.findMany({ where: { id: { in: orders.flatMap((o) => o.lines.map((l) => l.service_product_id).filter((x): x is string => !!x)) }, pricing_type: "RECURRING" }, select: { id: true } })).map((p) => p.id));
  const now = Date.now();
  const out = new Map<string, Sliced>();
  for (const o of orders) {
    const line = o.lines.find((l) => l.billing_cycle && (l.uom === "MONTH" || l.uom === "WEEK" || (l.service_product_id && subs.has(l.service_product_id))));
    let recurring: Recurring | null = null;
    if (line && LIVE.includes(o.status)) {
      const d = new Date((o.period_start ?? o.created_at).getTime());
      for (let i = 0; i < 500 && d.getTime() <= now; i++) {
        if (line.billing_cycle === "MONTHLY") d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + (STEP[line.billing_cycle!] ?? 30));
      }
      recurring = {
        orderId: o.id, paused: o.status === "ON_HOLD",
        next: d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" }),
        event: line.payment_event ? PAYMENT_EVENT_LABEL[line.payment_event] : "Payment Request",
        amountCents: line.amount_cents ?? Math.round(Number(line.quantity ?? 1) * (line.unit_price_cents ?? 0)),
      };
    }
    out.set(o.id, { completed: CLOSED.includes(o.status), recurring });
  }
  return out;
}
