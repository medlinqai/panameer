import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { queueConfirmation } from "@/lib/erp/outbound";
import { pricedByQuantity } from "@/lib/transaction-spine";
import { OrderError, partyFor } from "@/lib/orders";
import type { Viewer } from "@/lib/access";

// O-E003: change orders. The customer proposes; the provider accepts or rejects; terms change only on acceptance.
export type HeaderField = "not_to_exceed_cents" | "period_start" | "period_end" | "sow_text";
export type LineField = "quantity" | "unit_price_cents" | "amount_cents" | "service_start" | "service_end";
type Val = string | number | null;
export type Diff = { before: Val; after: Val };
export type Changes = {
  header: Partial<Record<HeaderField, Diff>>;
  lines: { lineId: string; lineNumber: number; fields: Partial<Record<LineField, Diff>> }[];
};

export type ChangeInput = {
  header?: Partial<Record<HeaderField, Val>>;
  lines?: { lineId: string; fields: Partial<Record<LineField, Val>> }[];
};

const OPEN = ["RELEASED", "ACTIVE"] as const;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (d: Prisma.Decimal | null) => (d == null ? null : Number(d));

async function personId(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!p) throw new OrderError("This account has no person record", "NOT_FOUND");
  return p.id;
}

/** Why a change order can't be raised right now, or null. */
export function changeBlocked(o: { status: string; frozen_at: Date | null }, pending: boolean): string | null {
  if (o.status === "ON_HOLD") return "This work order is on hold.";
  if (o.status === "CLOSED" || o.status === "FINALLY_CLOSED") return "This work order is closed.";
  if (!(OPEN as readonly string[]).includes(o.status)) return "Change orders are for open work orders.";
  if (o.frozen_at) return "This work order is frozen. Unfreeze it to change its terms.";
  if (pending) return "A change order is already waiting on the provider.";
  return null;
}

/** Builds the before/after diff against the order as it stands. Throws when nothing changed or a change is impossible. */
async function diffFor(orderId: string, input: ChangeInput): Promise<{ changes: Changes; order: { id: string; order_number: string; status: string; frozen_at: Date | null; buyer_person_id: string; provider_person_id: string; revision_number: number } }> {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, include: { lines: { orderBy: { line_number: "asc" } } } });
  if (!o) throw new OrderError("Work order not found", "NOT_FOUND");
  const changes: Changes = { header: {}, lines: [] };
  const h = input.header ?? {};
  const cur: Record<HeaderField, Val> = { not_to_exceed_cents: o.not_to_exceed_cents, period_start: day(o.period_start), period_end: day(o.period_end), sow_text: o.sow_text };
  for (const k of Object.keys(h) as HeaderField[]) {
    const after = h[k] === "" ? null : h[k] ?? null;
    if (after !== cur[k]) changes.header[k] = { before: cur[k], after };
  }
  for (const li of input.lines ?? []) {
    const l = o.lines.find((x) => x.id === li.lineId);
    if (!l) throw new OrderError("That line is not on this work order", "NOT_FOUND");
    const byQty = pricedByQuantity(l.transaction_type);
    const now: Record<LineField, Val> = { quantity: num(l.quantity), unit_price_cents: l.unit_price_cents, amount_cents: l.amount_cents, service_start: day(l.service_start), service_end: day(l.service_end) };
    const fields: Partial<Record<LineField, Diff>> = {};
    for (const k of Object.keys(li.fields) as LineField[]) {
      if ((k === "quantity" || k === "unit_price_cents") && !byQty) continue;
      if (k === "amount_cents" && byQty) continue;
      const after = li.fields[k] === "" ? null : li.fields[k] ?? null;
      if (after !== now[k]) fields[k] = { before: now[k], after };
    }
    if (fields.quantity && Number(fields.quantity.after ?? 0) < Number(l.drawn_quantity ?? 0))
      throw new OrderError(`Line ${l.line_number}: the quantity can't go below the ${Number(l.drawn_quantity)} already claimed`, "INVALID");
    if (fields.amount_cents && Number(fields.amount_cents.after ?? 0) < (l.drawn_amount_cents ?? 0))
      throw new OrderError(`Line ${l.line_number}: the amount can't go below what's already been drawn`, "INVALID");
    if (Object.keys(fields).length) changes.lines.push({ lineId: l.id, lineNumber: l.line_number, fields });
  }
  if (!Object.keys(changes.header).length && !changes.lines.length) throw new OrderError("Nothing changed", "INVALID");
  return { changes, order: o };
}

/** The customer raises a change order (or an ERP update arrives, already accepted by the customer). */
export async function proposeChange(viewer: Viewer | null, orderId: string, input: ChangeInput, opts?: { externalPayloadId?: string }): Promise<string> {
  const me = viewer ? await personId(viewer) : null;
  const { changes, order } = await diffFor(orderId, input);
  if (viewer && partyFor(order, me!) !== "BUYER") throw new OrderError("Only the customer can raise a change order", "FORBIDDEN");
  const pending = await prisma.workOrderRevision.count({ where: { work_order_id: orderId, status: "PENDING" } });
  const blocked = changeBlocked(order, pending > 0);
  if (blocked) throw new OrderError(blocked, "INVALID");
  const rev = await prisma.workOrderRevision.create({
    data: { work_order_id: orderId, revision_number: order.revision_number + 1, changes: changes as unknown as Prisma.InputJsonValue, requested_by_person_id: me, external_payload_id: opts?.externalPayloadId ?? null },
    select: { id: true, revision_number: true },
  });
  await prisma.workOrderEvent.create({ data: { work_order_id: orderId, person_id: me, kind: "change.proposed", text: `Change order ${rev.revision_number} sent to the provider` } });
  await notify({
    event: "work.change_order_received",
    personId: order.provider_person_id,
    entityType: "work_order",
    entityId: orderId,
    dedupeKey: `work.change_order_received:${rev.id}`,
    vars: { orderId, orderNumber: order.order_number, revision: rev.revision_number },
  });
  return rev.id;
}

/** The provider accepts (terms change, revision number increments) or rejects with a note. */
export async function decideChange(viewer: Viewer, orderId: string, revisionId: string, decision: "ACCEPT" | "REJECT", note?: string | null) {
  const me = await personId(viewer);
  const rev = await prisma.workOrderRevision.findFirst({ where: { id: revisionId, work_order_id: orderId } });
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!rev || !o) throw new OrderError("Change order not found", "NOT_FOUND");
  if (partyFor(o, me) !== "PROVIDER") throw new OrderError("Only the provider can accept or reject a change order", "FORBIDDEN");
  if (rev.status !== "PENDING") throw new OrderError("This change order has already been decided", "INVALID");
  if (decision === "REJECT" && (note ?? "").trim().length < 3) throw new OrderError("Say why, so the customer can answer it", "INVALID");
  const now = new Date();
  const ch = rev.changes as unknown as Changes;

  await prisma.$transaction(async (tx) => {
    const moved = await tx.workOrderRevision.updateMany({
      where: { id: rev.id, status: "PENDING" },
      data: decision === "ACCEPT" ? { status: "ACCEPTED", provider_accepted_at: now, decided_at: now, decided_note: note?.trim() || null } : { status: "REJECTED", decided_at: now, decided_note: note!.trim() },
    });
    if (moved.count === 0) throw new OrderError("This change order has already been decided", "INVALID");
    if (decision === "REJECT") return;
    const after = <T,>(d: Diff | undefined, f: (v: Val) => T) => (d ? f(d.after) : undefined);
    const date = (v: Val) => (v ? new Date(String(v)) : null);
    for (const l of ch.lines) {
      const f = l.fields;
      await tx.workOrderLine.update({
        where: { id: l.lineId },
        data: {
          quantity: after(f.quantity, (v) => (v == null ? null : new Prisma.Decimal(v))),
          unit_price_cents: after(f.unit_price_cents, (v) => (v == null ? null : Number(v))),
          amount_cents: after(f.amount_cents, (v) => (v == null ? null : Number(v))),
          service_start: after(f.service_start, date),
          service_end: after(f.service_end, date),
        },
      });
    }
    // The cap follows the new value unless the change set it explicitly.
    let nte = after(ch.header.not_to_exceed_cents, (v) => (v == null ? null : Number(v)));
    if (nte === undefined && ch.lines.length) {
      const lines = await tx.workOrderLine.findMany({ where: { work_order_id: orderId } });
      nte = lines.reduce((n, l) => n + (pricedByQuantity(l.transaction_type) ? Math.round(Number(l.quantity ?? 0) * (l.unit_price_cents ?? 0)) : l.amount_cents ?? 0), 0);
    }
    await tx.workOrder.update({
      where: { id: orderId },
      data: {
        revision_number: rev.revision_number,
        not_to_exceed_cents: nte,
        period_start: after(ch.header.period_start, date),
        period_end: after(ch.header.period_end, date),
        sow_text: after(ch.header.sow_text, (v) => (v == null ? null : String(v))),
      },
    });
  });
  await prisma.workOrderEvent.create({ data: { work_order_id: orderId, person_id: me, kind: `change.${decision.toLowerCase()}`, text: `Change order ${rev.revision_number} ${decision === "ACCEPT" ? "accepted" : "rejected"}` } });
  await prisma.notification.updateMany({ where: { dedupe_key: `work.change_order_received:${rev.id}`, resolved_at: null }, data: { resolved_at: now } }).catch(() => {});
  // X-E005: a change from the ERP is answered with a ConfirmationRequest.
  if (rev.external_payload_id) await queueConfirmation(orderId, decision === "ACCEPT" ? "accept" : "reject", note?.trim() || null, { number: rev.revision_number, payloadId: rev.external_payload_id });
  if (!rev.external_payload_id) {
    const prov = await prisma.person.findUnique({ where: { id: o.provider_person_id }, select: { first_name: true, last_name: true } });
    await notify({
      event: "work.change_order_decided",
      personId: o.buyer_person_id,
      entityType: "work_order",
      entityId: orderId,
      dedupeKey: `work.change_order_decided:${rev.id}`,
      vars: { orderId, orderNumber: o.order_number, revision: rev.revision_number, decision: decision === "ACCEPT" ? "accepted" : "rejected", note: note?.trim() || null, providerName: [prov?.first_name, prov?.last_name].filter(Boolean).join(" ") || null },
    });
  }
  return { revisionNumber: rev.revision_number, external: !!rev.external_payload_id };
}

export type RevisionView = { id: string; number: number; status: string; changes: Changes; createdAt: string; decidedAt: string | null; note: string | null; fromErp: boolean };

export async function revisionsFor(orderId: string): Promise<RevisionView[]> {
  const rows = await prisma.workOrderRevision.findMany({ where: { work_order_id: orderId }, orderBy: { revision_number: "desc" } });
  return rows.map((r) => ({ id: r.id, number: r.revision_number, status: r.status, changes: r.changes as unknown as Changes, createdAt: r.created_at.toISOString().slice(0, 10), decidedAt: r.decided_at ? r.decided_at.toISOString().slice(0, 10) : null, note: r.decided_note, fromErp: !!r.external_payload_id }));
}

const FIELD_LABEL: Record<HeaderField | LineField, string> = { not_to_exceed_cents: "Not to exceed", period_start: "Starts", period_end: "Ends", sow_text: "Statement of work", quantity: "Quantity", unit_price_cents: "Rate", amount_cents: "Amount", service_start: "Starts", service_end: "Ends" };

/** One readable line per change, e.g. "Line 1 · Rate: $120.00 → $130.00". */
export function describeChanges(ch: Changes, money: (c: number) => string): string[] {
  const fmt = (k: string, v: Val) => (v == null ? "—" : k.endsWith("_cents") ? money(Number(v)) : k === "sow_text" ? (String(v).length > 60 ? `${String(v).slice(0, 60)}…` : String(v)) : String(v));
  const out: string[] = [];
  for (const [k, d] of Object.entries(ch.header) as [HeaderField, Diff][]) out.push(`${FIELD_LABEL[k]}: ${fmt(k, d.before)} → ${fmt(k, d.after)}`);
  for (const l of ch.lines) for (const [k, d] of Object.entries(l.fields) as [LineField, Diff][]) out.push(`Line ${l.lineNumber} · ${FIELD_LABEL[k]}: ${fmt(k, d.before)} → ${fmt(k, d.after)}`);
  return out;
}
