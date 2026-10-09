import type { ErpMessageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cxmlDoc, cxmlUom, esc, payloadId, timestamp } from "@/lib/erp/cxml";
import { erpSendEnabled, logMessage } from "@/lib/erp/connections";

// X-E005/X-E006: outbound ERP messages. Queued as HELD while ERP_SEND_ENABLED is off — nothing leaves Panameer.
export async function queueOutbound(m: { connectionId: string; type: ErpMessageType; body: string; payloadId: string; workOrderId?: string | null; settlementRequestId?: string | null }) {
  const row = await logMessage({ ...m, direction: "OUT", status: erpSendEnabled() ? "QUEUED" : "HELD", response: erpSendEnabled() ? null : "Held: ERP sending is off (ERP_SEND_ENABLED)" });
  if (erpSendEnabled()) await sendMessage(row.id).catch(() => {});
  return row.id;
}

/** Sends one queued message. Refuses while sending is off; records the outcome either way. */
export async function sendMessage(id: string): Promise<{ ok: boolean; note: string }> {
  const m = await prisma.erpMessage.findUnique({ where: { id } });
  if (!m || m.direction !== "OUT") return { ok: false, note: "Not an outbound message" };
  if (!erpSendEnabled()) {
    await prisma.erpMessage.update({ where: { id }, data: { status: "HELD", response: "Held: ERP sending is off (ERP_SEND_ENABLED)" } });
    return { ok: false, note: "Sending is off" };
  }
  const conn = await prisma.erpConnection.findUnique({ where: { id: m.connection_id } });
  if (!conn?.active) return { ok: false, note: "Connection is off" };
  try {
    let response: string;
    const externalId: string | null = m.external_id;
    if (m.type === "CONFIRMATION") {
      if (!conn.outbound_cxml_url) throw new Error("No outbound cXML URL on this connection");
      const r = await fetch(conn.outbound_cxml_url, { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8" }, body: m.body });
      response = `${r.status} ${(await r.text()).slice(0, 2000)}`;
      if (!r.ok) throw new Error(response);
    } else throw new Error(`Nothing sends ${m.type}`);
    await prisma.erpMessage.update({ where: { id }, data: { status: "SENT", response, external_id: externalId, attempts: { increment: 1 }, last_error: null } });
    return { ok: true, note: "Sent" };
  } catch (e) {
    await prisma.erpMessage.update({ where: { id }, data: { status: "FAILED", attempts: { increment: 1 }, last_error: (e as Error).message.slice(0, 2000) } });
    return { ok: false, note: (e as Error).message };
  }
}

/** The payloadID of the OrderRequest a confirmation answers (new, or the update a change order came from). */
async function orderDocPayload(connectionId: string, poNumber: string, revisionPayload?: string | null) {
  if (revisionPayload) return revisionPayload;
  const m = await prisma.erpMessage.findFirst({ where: { connection_id: connectionId, type: "ORDER_REQUEST", direction: "IN", body: { contains: `orderID="${poNumber}"` } }, orderBy: { created_at: "asc" }, select: { payload_id: true } });
  return m?.payload_id ?? null;
}

/** X-E005: the provider accepted or rejected an ERP order (or one of its change orders) → ConfirmationRequest. */
export async function queueConfirmation(orderId: string, kind: "accept" | "reject", note?: string | null, revision?: { number: number; payloadId: string | null }) {
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, include: { lines: { orderBy: { line_number: "asc" } } } });
  if (!o?.erp_connection_id || !o.external_ref) return null;
  const conn = await prisma.erpConnection.findUnique({ where: { id: o.erp_connection_id } });
  if (!conn) return null;
  const docPid = await orderDocPayload(conn.id, o.external_ref, revision?.payloadId);
  const pid = payloadId();
  const now = timestamp();
  const items = o.lines
    .filter((l) => l.external_line_ref)
    .map((l) => `      <ConfirmationItem quantity="${esc(l.quantity == null ? 1 : Number(l.quantity))}" lineNumber="${esc(l.external_line_ref)}"><UnitOfMeasure>${cxmlUom(l.uom)}</UnitOfMeasure><ConfirmationStatus quantity="${esc(l.quantity == null ? 1 : Number(l.quantity))}" type="${kind}"><UnitOfMeasure>${cxmlUom(l.uom)}</UnitOfMeasure></ConfirmationStatus></ConfirmationItem>`);
  const body = `  <Request>
    <ConfirmationRequest>
      <ConfirmationHeader type="${kind}" noticeDate="${now}" confirmID="${esc(`${o.order_number}${revision ? `-R${revision.number}` : ""}`)}" operation="new">${note ? `<Comments xml:lang="en-US">${esc(note)}</Comments>` : ""}</ConfirmationHeader>
      <OrderReference orderID="${esc(o.external_ref)}">${docPid ? `<DocumentReference payloadID="${esc(docPid)}"/>` : ""}</OrderReference>
${items.join("\n")}
    </ConfirmationRequest>
  </Request>`;
  const xml = cxmlDoc({ fromDomain: conn.to_domain, fromIdentity: conn.to_identity, toDomain: conn.from_domain, toIdentity: conn.from_identity }, body, { payloadId: pid, timestamp: now });
  return queueOutbound({ connectionId: conn.id, type: "CONFIRMATION", body: xml, payloadId: pid, workOrderId: o.id });
}
