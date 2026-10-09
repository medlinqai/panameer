import { prisma } from "@/lib/prisma";
import { cxmlDoc, cxmlUom, esc, payloadId, timestamp } from "@/lib/erp/cxml";
import { logMessage } from "@/lib/erp/connections";
import type { PunchoutSessionLive } from "@/lib/erp/punchout";

// X-E003: shop in a punchout session — attach a provider's service to the session's work request, then return the cart.
const DEFAULT_UNSPSC = "80101500"; // Business and corporate management consultation services

export type CartService = { id: string; name: string; providerName: string; providerPersonId: string; type: "SERVICE_BY_QTY" | "SERVICE_BY_AMT"; uom: string | null; rateCents: number };

export async function searchServices(q: string): Promise<CartService[]> {
  const term = q.trim();
  const byPerson = term
    ? (await prisma.providerProfile.findMany({ where: { person: { OR: [{ first_name: { contains: term, mode: "insensitive" } }, { last_name: { contains: term, mode: "insensitive" } }] } }, select: { id: true }, take: 200 })).map((p) => p.id)
    : [];
  const rows = await prisma.providerService.findMany({
    where: { active: true, published_at: { not: null }, rate_cents: { not: null }, ...(term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { provider_profile_id: { in: byPerson } }] } : {}) },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  const profiles = await prisma.providerProfile.findMany({ where: { id: { in: rows.map((r) => r.provider_profile_id) } }, select: { id: true, person: { select: { id: true, first_name: true, last_name: true } } } });
  const byId = new Map(profiles.map((p) => [p.id, p.person]));
  return rows.flatMap((r) => {
    const p = byId.get(r.provider_profile_id);
    return p ? [{ id: r.id, name: r.name, providerName: `${p.first_name} ${p.last_name}`.trim(), providerPersonId: p.id, type: r.service_type === "SERVICE_BY_AMT" ? ("SERVICE_BY_AMT" as const) : ("SERVICE_BY_QTY" as const), uom: r.uom, rateCents: r.rate_cents ?? 0 }] : [];
  });
}

async function cartRequest(s: PunchoutSessionLive): Promise<string> {
  if (s.work_request_id) return s.work_request_id;
  const wr = await prisma.workRequest.create({
    data: {
      buyer_person_id: s.requester_person_id, p_account_id: s.connection.p_account_id, title: `Punchout ${new Date().toISOString().slice(0, 10)}`,
      status: "DRAFT", proposal_access: "INVITE_ONLY", sole_sourced: true, erp_connection_id: s.connection_id,
    },
    select: { id: true },
  });
  await prisma.punchoutSession.update({ where: { id: s.id }, data: { work_request_id: wr.id } });
  return wr.id;
}

export async function addToCart(s: PunchoutSessionLive, input: { serviceId: string; quantity?: number | null; start?: string | null; end?: string | null }) {
  const svc = await prisma.providerService.findFirst({ where: { id: input.serviceId, active: true, published_at: { not: null } } });
  if (!svc?.rate_cents) throw new Error("That service isn't available");
  const profile = await prisma.providerProfile.findUnique({ where: { id: svc.provider_profile_id }, select: { person: { select: { id: true, first_name: true, last_name: true } } } });
  if (!profile) throw new Error("That provider isn't available");
  const byQty = svc.service_type !== "SERVICE_BY_AMT";
  const qty = byQty ? Number(input.quantity ?? 0) : null;
  if (byQty && (!qty || qty <= 0 || qty > 100000)) throw new Error("Enter a quantity");
  const wrId = await cartRequest(s);
  const n = await prisma.workRequestLine.count({ where: { work_request_id: wrId } });
  await prisma.workRequestLine.create({
    data: {
      work_request_id: wrId, line_number: n + 1, transaction_type: svc.service_type, description: `${svc.name} — ${profile.person.first_name} ${profile.person.last_name}`.trim(),
      unspsc_code: svc.unspsc_code ?? DEFAULT_UNSPSC, uom: byQty ? svc.uom ?? "HOUR" : null, quantity: qty, unit_price_cents: byQty ? svc.rate_cents : null, amount_cents: byQty ? null : svc.rate_cents,
      provider_person_id: profile.person.id, provider_service_id: svc.id, status: "ASSIGNED",
      service_start: input.start ? new Date(input.start) : null, service_end: input.end ? new Date(input.end) : null,
    },
  });
}

export async function removeFromCart(s: PunchoutSessionLive, lineId: string) {
  if (!s.work_request_id) return;
  await prisma.workRequestLine.deleteMany({ where: { id: lineId, work_request_id: s.work_request_id, work_order_id: null } });
}

export async function cartLines(s: PunchoutSessionLive) {
  if (!s.work_request_id) return [];
  return prisma.workRequestLine.findMany({ where: { work_request_id: s.work_request_id }, orderBy: { line_number: "asc" } });
}

/** The PunchOutOrderMessage: one ItemIn per work request line (amount lines as 1 × amount). */
export function orderMessageXml(
  s: { buyer_cookie: string; connection: { from_domain: string; from_identity: string; to_identity: string; to_domain: string } },
  lines: { id: string; line_number: number; transaction_type: string; description: string; unspsc_code: string | null; uom: string | null; quantity: unknown; unit_price_cents: number | null; amount_cents: number | null; provider_service_id: string | null; service_product_id?: string | null }[],
  currency = "USD",
  opts?: { payloadId?: string; timestamp?: string }
) {
  const money = (c: number) => (c / 100).toFixed(2);
  let total = 0;
  const items = lines.map((l) => {
    const byQty = l.transaction_type !== "SERVICE_BY_AMT";
    const qty = byQty ? Number(l.quantity ?? 0) : 1;
    const unit = byQty ? l.unit_price_cents ?? 0 : l.amount_cents ?? 0;
    total += Math.round(qty * unit);
    return `      <ItemIn quantity="${esc(qty)}" lineNumber="${l.line_number}">
        <ItemID><SupplierPartID>${esc(l.provider_service_id ?? l.service_product_id ?? "")}</SupplierPartID><SupplierPartAuxiliaryID>${esc(l.id)}</SupplierPartAuxiliaryID></ItemID>
        <ItemDetail>
          <UnitPrice><Money currency="${esc(currency)}">${money(unit)}</Money></UnitPrice>
          <Description xml:lang="en-US">${esc(l.description)}</Description>
          <UnitOfMeasure>${byQty ? cxmlUom(l.uom) : "EA"}</UnitOfMeasure>
          <Classification domain="UNSPSC">${esc(l.unspsc_code ?? DEFAULT_UNSPSC)}</Classification>
        </ItemDetail>
      </ItemIn>`;
  });
  // Panameer is the From; the customer's ERP is the To.
  const header = { fromDomain: s.connection.to_domain, fromIdentity: s.connection.to_identity, toDomain: s.connection.from_domain, toIdentity: s.connection.from_identity };
  const body = `  <Message>
    <PunchOutOrderMessage>
      <BuyerCookie>${esc(s.buyer_cookie)}</BuyerCookie>
      <PunchOutOrderMessageHeader operationAllowed="edit">
        <Total><Money currency="${esc(currency)}">${money(total)}</Money></Total>
      </PunchOutOrderMessageHeader>
${items.join("\n")}
    </PunchOutOrderMessage>
  </Message>`;
  return cxmlDoc(header, body, { payloadId: opts?.payloadId ?? payloadId(), timestamp: opts?.timestamp ?? timestamp() });
}

/** Return to ERP: closes the session, marks the request Awarded, logs the message, and hands back what the browser posts. */
export async function returnCart(s: PunchoutSessionLive): Promise<{ url: string; xml: string }> {
  const lines = await cartLines(s);
  if (!lines.length) throw new Error("Add a provider before returning to your ERP");
  const xml = orderMessageXml(s, lines);
  const pid = /payloadID="([^"]+)"/.exec(xml)?.[1] ?? `pom-${Date.now()}`;
  await prisma.$transaction([
    prisma.workRequest.update({ where: { id: s.work_request_id! }, data: { status: "ASSIGNED", erp_returned_at: new Date() } }),
    prisma.punchoutSession.update({ where: { id: s.id }, data: { returned_at: new Date() } }),
  ]);
  await logMessage({ connectionId: s.connection_id, direction: "OUT", type: "PUNCHOUT_ORDER", payloadId: pid, status: "PROCESSED", body: xml, workRequestId: s.work_request_id, response: "Posted by the requester's browser to BrowserFormPost" });
  return { url: s.browser_form_post_url, xml };
}
