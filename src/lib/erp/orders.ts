import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { resolveCommissionBps, sourcingKindForLine } from "@/lib/application-commissions";
import { pricedByQuantity } from "@/lib/transaction-spine";
import { snapshotTerms } from "@/lib/work-orders";
import { proposeChange, type ChangeInput } from "@/lib/change-orders";
import { all, attr, first, parseCxml, statusResponse, text } from "@/lib/erp/cxml";
import { authenticate } from "@/lib/erp/punchout";
import { findMessage, logMessage } from "@/lib/erp/connections";

// X-E004: cXML OrderRequest in. new → work order(s) (one per provider), update → change order, delete → Canceled.
type PoItem = { lineNumber: string; auxId: string; quantity: number; unitPriceCents: number };

const cents = (s: string) => Math.round(Number(s || "0") * 100);

function readItems(doc: Document): PoItem[] {
  return all(doc, "ItemOut").map((it) => ({
    lineNumber: attr(it, "lineNumber"),
    auxId: text(first(first(it, "ItemID"), "SupplierPartAuxiliaryID")),
    quantity: Number(attr(it, "quantity") || "0"),
    unitPriceCents: cents(text(first(first(first(it, "ItemDetail"), "UnitPrice"), "Money"))),
  }));
}

/** Handles one OrderRequest. Idempotent on payloadID. */
export async function handleOrderRequest(xml: string): Promise<{ status: number; body: string }> {
  let doc: Document;
  try {
    doc = parseCxml(xml);
  } catch {
    return { status: 400, body: statusResponse(400, "Bad Request") };
  }
  const conn = await authenticate(doc);
  if (!conn) return { status: 401, body: statusResponse(401, "Unauthorized") };
  const pid = attr(doc.documentElement, "payloadID");
  if (!pid) return { status: 400, body: statusResponse(400, "Missing payloadID") };
  if (await findMessage(conn.id, pid)) return { status: 200, body: statusResponse(200, "OK (already processed)") };

  const header = first(doc, "OrderRequestHeader");
  const orderId = attr(header, "orderID");
  const type = (attr(header, "type") || "new").toLowerCase();
  if (!orderId) return { status: 400, body: statusResponse(400, "Missing orderID") };
  const items = readItems(doc);

  try {
    const result =
      type === "new" ? await createOrders(conn.id, conn.p_account_id, orderId, items)
      : type === "update" ? await updateOrders(conn.id, orderId, items, pid)
      : type === "delete" ? await cancelOrders(conn.id, orderId)
      : null;
    if (!result) return { status: 400, body: statusResponse(400, `Unknown OrderRequest type "${type}"`) };
    await logMessage({ connectionId: conn.id, direction: "IN", type: "ORDER_REQUEST", payloadId: pid, status: "PROCESSED", body: xml, workRequestId: result.workRequestId, workOrderId: result.orderIds[0] ?? null, response: `${type}: ${result.orderIds.length} work order(s)` });
    return { status: 200, body: statusResponse(200, "OK") };
  } catch (e) {
    const msg = (e as Error).message;
    await logMessage({ connectionId: conn.id, direction: "IN", type: "ORDER_REQUEST", payloadId: pid, status: "FAILED", body: xml, response: msg }).catch(() => {});
    return { status: 400, body: statusResponse(400, msg.slice(0, 200)) };
  }
}

/** new: fan out by provider. Customer acceptance is set on arrival — the ERP approval is the acceptance. */
async function createOrders(connectionId: string, pAccountId: string, poNumber: string, items: PoItem[]) {
  if (!items.length) throw new Error("The purchase order has no lines");
  const reqLines = await prisma.workRequestLine.findMany({ where: { id: { in: items.map((i) => i.auxId) } } });
  if (reqLines.length !== items.length) throw new Error("A line doesn't match a Panameer cart line (SupplierPartAuxiliaryID)");
  const wrIds = [...new Set(reqLines.map((l) => l.work_request_id))];
  const wrs = await prisma.workRequest.findMany({ where: { id: { in: wrIds } } });
  if (wrs.some((w) => w.p_account_id !== pAccountId || w.erp_connection_id !== connectionId)) throw new Error("A line belongs to another customer");
  if (reqLines.some((l) => l.work_order_id)) throw new Error("A line is already on a work order");

  const byProvider = new Map<string, typeof reqLines>();
  for (const l of reqLines) {
    if (!l.provider_person_id) throw new Error("A line has no provider");
    byProvider.set(l.provider_person_id, [...(byProvider.get(l.provider_person_id) ?? []), l]);
  }
  const itemFor = new Map(items.map((i) => [i.auxId, i]));
  const now = new Date();
  const orderIds: string[] = [];
  for (const [providerId, lines] of byProvider) {
    const wr = wrs.find((w) => w.id === lines[0].work_request_id)!;
    const terms = await snapshotTerms(lines, providerId);
    const fees = new Map<string, number>();
    for (const l of lines) fees.set(l.id, (await resolveCommissionBps(sourcingKindForLine({ soleSourced: wr.sole_sourced, supplierPartId: l.supplier_part_id, serviceProductId: l.service_product_id }), l.transaction_type)).bps);
    const distinct = [...new Set(fees.values())];
    // The PO is the authority on quantity and price; an amount line arrives as 1 × amount.
    const priced = lines.map((l) => {
      const it = itemFor.get(l.id)!;
      const byQty = pricedByQuantity(l.transaction_type);
      return { l, it, byQty, quantity: byQty ? it.quantity : null, unit: byQty ? it.unitPriceCents : null, amount: byQty ? null : Math.round(it.quantity * it.unitPriceCents) };
    });
    const value = priced.reduce((n, p) => n + (p.byQty ? Math.round((p.quantity ?? 0) * (p.unit ?? 0)) : p.amount ?? 0), 0);
    const starts = lines.map((l) => l.service_start).filter((d): d is Date => !!d);
    const ends = lines.map((l) => l.service_end).filter((d): d is Date => !!d);
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.workOrder.create({
        data: {
          order_number: `WO-${Date.now().toString(36).toUpperCase()}-${wr.id.slice(0, 4)}`,
          origin: "DIRECT", work_request_id: wr.id, buyer_person_id: wr.buyer_person_id, p_account_id: wr.p_account_id, provider_person_id: providerId,
          currency: wr.currency, status: "ISSUED", buyer_accepted_at: now, external_ref: poNumber, erp_connection_id: connectionId,
          fee_bps: distinct.length === 1 ? distinct[0] : null, not_to_exceed_cents: value,
          period_start: starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : null,
          period_end: ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null,
          lines: {
            create: priced.map(({ l, it, quantity, unit, amount }) => ({
              line_number: l.line_number, work_request_line_id: l.id, transaction_type: l.transaction_type, fee_bps: fees.get(l.id)!, description: l.description, unspsc_code: l.unspsc_code,
              uom: l.uom, quantity: quantity == null ? null : new Prisma.Decimal(quantity), unit_price_cents: unit, amount_cents: amount, supplier_part_id: l.supplier_part_id,
              external_line_ref: it.lineNumber || null, service_start: l.service_start, service_end: l.service_end, ...terms.get(l.id)!,
            })),
          },
        },
        select: { id: true, order_number: true },
      });
      await tx.workRequestLine.updateMany({ where: { id: { in: lines.map((l) => l.id) } }, data: { status: "ORDERED", work_order_id: o.id } });
      return o;
    });
    orderIds.push(order.id);
    await notify({ event: "work.order_offered", personId: providerId, entityType: "work_order", entityId: order.id, dedupeKey: `work.order_offered:${order.id}`, vars: { orderId: order.id, requestTitle: `PO ${poNumber} from the customer's ERP` } });
  }
  await prisma.workRequest.updateMany({ where: { id: { in: wrIds } }, data: { status: "ORDERED" } });
  return { workRequestId: wrIds[0] ?? null, orderIds };
}

/** update: each changed order becomes a change order with the customer side already accepted. */
async function updateOrders(connectionId: string, poNumber: string, items: PoItem[], payloadId: string) {
  const orders = await prisma.workOrder.findMany({ where: { external_ref: poNumber, erp_connection_id: connectionId }, include: { lines: true } });
  if (!orders.length) throw new Error(`No work order for PO ${poNumber}`);
  const itemFor = new Map(items.map((i) => [i.auxId, i]));
  const touched: string[] = [];
  for (const o of orders) {
    const input: ChangeInput = { lines: [] };
    for (const l of o.lines) {
      const it = l.work_request_line_id ? itemFor.get(l.work_request_line_id) : undefined;
      if (!it) continue;
      input.lines!.push({ lineId: l.id, fields: pricedByQuantity(l.transaction_type) ? { quantity: it.quantity, unit_price_cents: it.unitPriceCents } : { amount_cents: Math.round(it.quantity * it.unitPriceCents) } });
    }
    if (o.status === "ISSUED" && !o.provider_accepted_at) {
      // Not yet acknowledged: the PO's new terms simply replace the offer.
      let value = 0;
      for (const l of o.lines) {
        const f = input.lines!.find((x) => x.lineId === l.id)?.fields;
        const q = f?.quantity != null ? Number(f.quantity) : l.quantity == null ? null : Number(l.quantity);
        const u = f?.unit_price_cents != null ? Number(f.unit_price_cents) : l.unit_price_cents;
        const a = f?.amount_cents != null ? Number(f.amount_cents) : l.amount_cents;
        value += pricedByQuantity(l.transaction_type) ? Math.round((q ?? 0) * (u ?? 0)) : a ?? 0;
        if (f) await prisma.workOrderLine.update({ where: { id: l.id }, data: { quantity: q == null ? null : new Prisma.Decimal(q), unit_price_cents: u, amount_cents: a } });
      }
      await prisma.workOrder.update({ where: { id: o.id }, data: { not_to_exceed_cents: value } });
      await prisma.workOrderEvent.create({ data: { work_order_id: o.id, kind: "erp.updated", text: `PO ${poNumber} updated in the customer's ERP before acknowledgment` } });
      touched.push(o.id);
      continue;
    }
    try {
      await proposeChange(null, o.id, input, { externalPayloadId: payloadId });
      touched.push(o.id);
    } catch (e) {
      if ((e as Error).message !== "Nothing changed") throw e;
    }
  }
  return { workRequestId: orders[0].work_request_id, orderIds: touched };
}

/** delete: the PO was canceled in the ERP. */
async function cancelOrders(connectionId: string, poNumber: string) {
  const orders = await prisma.workOrder.findMany({ where: { external_ref: poNumber, erp_connection_id: connectionId, status: { notIn: ["CANCELLED", "FINALLY_CLOSED"] } } });
  for (const o of orders) {
    await prisma.workOrder.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
    await prisma.workOrderLine.updateMany({ where: { work_order_id: o.id }, data: { status: "CANCELLED" } });
    await prisma.workOrderEvent.create({ data: { work_order_id: o.id, kind: "erp.canceled", text: `Canceled in the customer's ERP (PO ${poNumber})` } });
    await prisma.notification.updateMany({ where: { dedupe_key: `work.order_offered:${o.id}`, resolved_at: null }, data: { resolved_at: new Date() } });
    await notify({ event: "work.order_control", personId: o.provider_person_id, entityType: "work_order", entityId: o.id, dedupeKey: `work.order_control:${o.id}:ERP_CANCEL`, vars: { orderId: o.id, orderNumber: o.order_number, buyerName: "The customer", text: `canceled PO ${poNumber} in their ERP, so ${o.order_number} is canceled.`, done: "Canceled" } });
  }
  return { workRequestId: orders[0]?.work_request_id ?? null, orderIds: orders.map((o) => o.id) };
}
