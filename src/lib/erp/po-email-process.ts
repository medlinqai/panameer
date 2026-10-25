import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// PE-E004: read an emailed PO PDF and match it exactly — Oracle prints our cart line id as "Supplier Configuration ID"
// (the SupplierPartAuxiliaryID we sent on Return Cart). Every line matches → the same Order(s) the cXML route makes;
// anything else → Needs Review with a reason per line; nothing is created. Idempotent on (connection, PO number, revision).
const PO_SCHEMA = z.object({
  poNumber: z.string().nullable(),
  revision: z.number().nullable().default(0),
  orderDate: z.string().nullable().default(null),
  total: z.number().nullable().default(null),
  lines: z.array(z.object({ lineNumber: z.union([z.string(), z.number()]).nullable(), description: z.string().nullable(), supplierItem: z.string().nullable(), supplierConfigurationId: z.string().nullable(), quantity: z.number().nullable(), unitPrice: z.number().nullable(), uom: z.string().nullable() })).default([]),
});
export type ParsedPo = z.infer<typeof PO_SCHEMA>;
export type LineCheck = { lineNumber: string; supplierConfigurationId: string | null; ok: boolean; reason: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readPdf(bytes: Buffer): Promise<ParsedPo> {
  const { extractText } = await import("@/lib/resume/extract");
  const text = await extractText(bytes, "application/pdf", "po.pdf");
  const { callExtractionModel } = await import("@/lib/resume/ai-provider");
  const s = { type: ["string", "null"] }, n = { type: ["number", "null"] };
  const call = await callExtractionModel({
    timeoutMs: 90_000,
    system: "You read a purchase order PDF from an ERP (usually Oracle Cloud) sent to a supplier. Return ONLY what the document states. 'supplierConfigurationId' is the value printed as 'Supplier Configuration ID' (or 'Supplier Config ID') on each line — copy it exactly. 'supplierItem' is the 'Supplier Item'. Quantities and prices as plain numbers (no currency signs). Revision is the PO revision number (0 if none shown).",
    schema: { type: "object", properties: { poNumber: s, revision: n, orderDate: s, total: n, lines: { type: "array", items: { type: "object", properties: { lineNumber: s, description: s, supplierItem: s, supplierConfigurationId: s, quantity: n, unitPrice: n, uom: s }, required: ["lineNumber", "supplierConfigurationId", "quantity", "unitPrice"] } } }, required: ["poNumber", "lines"] },
    schemaName: "record_purchase_order",
    text: text.slice(0, 60_000),
    instruction: "Extract this purchase order.",
    tag: "purchase_order",
    toolDescription: "Record the purchase order header and lines.",
    maxOutputTokens: 4_000,
  });
  if (!call.ok) throw new Error("The PO PDF couldn't be read.");
  const parsed = PO_SCHEMA.safeParse(call.value);
  if (!parsed.success) throw new Error("The PO PDF was read in a shape we couldn't use.");
  return parsed.data;
}

/** Each PO line against the cart line it names: this connection's account, not yet ordered, same quantity and price (±$0.01). */
export async function matchLines(connectionId: string, pAccountId: string, po: ParsedPo): Promise<LineCheck[]> {
  const ids = po.lines.map((l) => (l.supplierConfigurationId ?? "").trim()).filter((x) => UUID.test(x));
  const lines = await prisma.workRequestLine.findMany({ where: { id: { in: ids } }, include: { workRequest: { select: { p_account_id: true, erp_connection_id: true } } } });
  const prices = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: lines.map((l) => l.service_product_id).filter((x): x is string => !!x) } }, select: { id: true, price_cents: true } })).map((p) => [p.id, p.price_cents ?? 0]));
  return po.lines.map((p, i) => {
    const lineNumber = String(p.lineNumber ?? i + 1);
    const id = (p.supplierConfigurationId ?? "").trim();
    const bad = (reason: string): LineCheck => ({ lineNumber, supplierConfigurationId: id || null, ok: false, reason });
    if (!id) return bad("No Supplier Configuration ID on this line");
    const l = lines.find((x) => x.id === id);
    if (!l) return bad("No Panameer cart line with this Supplier Configuration ID");
    if (l.workRequest.p_account_id !== pAccountId || l.workRequest.erp_connection_id !== connectionId) return bad("This line belongs to another customer");
    if (l.work_order_id) return bad("This line is already on an Order");
    if (p.quantity == null || p.unitPrice == null) return bad("Quantity or unit price missing on the PO");
    const unit = Math.round(p.unitPrice * 100);
    if (l.transaction_type === "SERVICE_BY_AMT") {
      // Amount lines went out as n × unit (or 1 × amount) — the PO total for the line must equal the cart amount.
      const total = Math.round(p.quantity * p.unitPrice * 100);
      const want = l.amount_cents ?? 0;
      if (Math.abs(total - want) > 1) return bad(`Amount ${(total / 100).toFixed(2)} ≠ cart ${(want / 100).toFixed(2)}`);
      const ea = l.service_product_id ? prices.get(l.service_product_id) : undefined;
      if (ea && Math.abs(unit - ea) > 1 && Math.abs(unit - want) > 1) return bad(`Unit price ${(unit / 100).toFixed(2)} ≠ cart ${(ea / 100).toFixed(2)}`);
      return { lineNumber, supplierConfigurationId: id, ok: true, reason: null };
    }
    const qty = Number(l.quantity ?? 0);
    if (Math.abs(p.quantity - qty) > 0.0001) return bad(`Quantity ${p.quantity} ≠ cart ${qty}`);
    if (Math.abs(unit - (l.unit_price_cents ?? 0)) > 1) return bad(`Unit price ${(unit / 100).toFixed(2)} ≠ cart ${((l.unit_price_cents ?? 0) / 100).toFixed(2)}`);
    return { lineNumber, supplierConfigurationId: id, ok: true, reason: null };
  });
}

/** Turn a matched PO into Order(s) with the shared cXML function; records the result on the email row. */
async function createFromParsed(emailId: string) {
  const row = await prisma.erpPoEmail.findUniqueOrThrow({ where: { id: emailId } });
  const conn = await prisma.erpConnection.findUniqueOrThrow({ where: { id: row.connection_id } });
  const po = PO_SCHEMA.parse((row.parsed as { po?: unknown } | null)?.po ?? {});
  const checks = await matchLines(conn.id, conn.p_account_id, po);
  if (!po.lines.length || checks.some((c) => !c.ok)) {
    await prisma.erpPoEmail.update({ where: { id: emailId }, data: { status: "NEEDS_REVIEW", parsed: { po, checks }, note: !po.lines.length ? "No lines read from the PO" : `${checks.filter((c) => !c.ok).length} line(s) don't match` } });
    await notifyNeedsReview(emailId);
    return null;
  }
  const { createOrders } = await import("@/lib/erp/orders");
  const items = po.lines.map((l, i) => ({ lineNumber: String(l.lineNumber ?? i + 1), auxId: (l.supplierConfigurationId ?? "").trim(), quantity: l.quantity ?? 0, unitPriceCents: Math.round((l.unitPrice ?? 0) * 100) }));
  const r = await createOrders(conn.id, conn.p_account_id, po.poNumber!, items);
  await prisma.erpPoEmail.update({ where: { id: emailId }, data: { status: "PROCESSED", parsed: { po, checks }, work_request_id: r.workRequestId, order_ids: r.orderIds, note: null } });
  const { logMessage } = await import("@/lib/erp/connections");
  await logMessage({ connectionId: conn.id, direction: "IN", type: "PO_EMAIL", payloadId: `po-email:${row.resend_email_id}`, status: "PROCESSED", body: JSON.stringify(po).slice(0, 20_000), workRequestId: r.workRequestId, workOrderId: r.orderIds[0] ?? null, response: `PO ${po.poNumber}: ${r.orderIds.length} order(s)` }).catch(() => null);
  // The buyer hears the Order was made (the ERP approval was their acceptance).
  const orders = await prisma.workOrder.findMany({ where: { id: { in: r.orderIds } }, select: { id: true, order_number: true, buyer_person_id: true } });
  for (const o of orders) await notify({ event: "work.order_from_po", personId: o.buyer_person_id, entityType: "work_order", entityId: o.id, dedupeKey: `work.order_from_po:${o.id}`, vars: { orderId: o.id, orderNumber: o.order_number, poNumber: po.poNumber ?? "" } });
  return r;
}

export async function processPoEmail(emailId: string) {
  const row = await prisma.erpPoEmail.findUniqueOrThrow({ where: { id: emailId } });
  if (!row.pdf_storage_path) return;
  const { poEmailPdfBytes } = await import("@/lib/storage");
  const bytes = await poEmailPdfBytes(row.pdf_storage_path);
  if (!bytes) throw new Error("The stored PO PDF couldn't be read back.");
  const po = await readPdf(bytes);
  const revision = Math.max(0, Math.round(po.revision ?? 0));
  if (!po.poNumber) {
    await prisma.erpPoEmail.update({ where: { id: emailId }, data: { status: "NEEDS_REVIEW", parsed: { po }, note: "No PO number found" } });
    return notifyNeedsReview(emailId);
  }
  await prisma.erpPoEmail.update({ where: { id: emailId }, data: { po_number: po.poNumber, revision, parsed: { po } } });
  // A re-sent PDF (same PO and revision) does nothing; an Order already carrying this PO number counts too.
  const dup = await prisma.erpPoEmail.findFirst({ where: { connection_id: row.connection_id, po_number: po.poNumber, revision, status: "PROCESSED", id: { not: emailId } }, select: { order_ids: true } });
  const ordered = await prisma.workOrder.findFirst({ where: { erp_connection_id: row.connection_id, erp_po_number: po.poNumber }, select: { id: true } });
  if (dup || (ordered && revision === 0)) {
    await prisma.erpPoEmail.update({ where: { id: emailId }, data: { status: "PROCESSED", order_ids: dup?.order_ids ?? (ordered ? [ordered.id] : []), note: "Already processed — nothing new" } });
    return;
  }
  if (revision > 0) {
    await prisma.erpPoEmail.update({ where: { id: emailId }, data: { status: "NEEDS_REVIEW", note: "Changed PO — Review" } });
    return notifyNeedsReview(emailId);
  }
  await createFromParsed(emailId);
}

/** PE-E005: the admin's Create Order on a Needs Review row — only when every line now matches. */
export async function createFromReview(emailId: string) {
  const row = await prisma.erpPoEmail.findUniqueOrThrow({ where: { id: emailId }, select: { status: true, revision: true } });
  if (row.status !== "NEEDS_REVIEW") throw new Error("Only a Needs Review email can be turned into an Order here.");
  if ((row.revision ?? 0) > 0) throw new Error("A changed PO needs a Change Order, not a new Order.");
  const r = await createFromParsed(emailId);
  if (!r) throw new Error("Some lines still don't match — see the reasons.");
  return r;
}

/** Scott (Panameer admins) hear about every PO email that needs a person. */
export async function notifyNeedsReview(emailId: string) {
  const row = await prisma.erpPoEmail.findUnique({ where: { id: emailId }, select: { id: true, po_number: true, note: true, from_address: true, connection_id: true } });
  if (!row) return;
  const conn = await prisma.erpConnection.findUnique({ where: { id: row.connection_id }, select: { name: true } });
  const admins = await prisma.person.findMany({ where: { user: { is_system_admin: true, is_active: true } }, select: { id: true } });
  for (const a of admins) await notify({ event: "admin.po_email_review", personId: a.id, entityType: "erp_po_email", entityId: row.id, dedupeKey: `admin.po_email_review:${row.id}:${a.id}`, vars: { po: row.po_number ?? "(no PO number)", company: conn?.name ?? "", note: row.note ?? "", from: row.from_address } });
}
