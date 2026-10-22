import { nextNumber, PREFIX } from "@/lib/numbering";
import { searchVariants } from "@/lib/search-synonyms";
import { prisma } from "@/lib/prisma";
import { effectiveRates } from "@/lib/company-catalog";
import { cxmlDoc, cxmlUom, esc, payloadId, timestamp } from "@/lib/erp/cxml";
import { logMessage } from "@/lib/erp/connections";
import type { PunchoutSessionLive } from "@/lib/erp/punchout";

// X-E003: shop in a punchout session — attach a provider's service to the session's work request, then return the cart.
const DEFAULT_UNSPSC = "80101500"; // Business and corporate management consultation services

export type CartService = { id: string; name: string; providerName: string; providerPersonId: string; type: "SERVICE_BY_QTY" | "SERVICE_BY_AMT"; uom: string | null; rateCents: number; expenses: string | null };

export async function searchServices(q: string): Promise<CartService[]> {
  const term = q.trim();
  const byPerson = term
    ? (await prisma.providerProfile.findMany({ where: { person: { OR: [{ first_name: { contains: term, mode: "insensitive" } }, { last_name: { contains: term, mode: "insensitive" } }] } }, select: { id: true }, take: 200 })).map((p) => p.id)
    : [];
  const raw = await prisma.providerService.findMany({
    where: { active: true, published_at: { not: null }, rate_cents: { not: null }, ...(term ? { OR: [...searchVariants(term).map((v) => ({ name: { contains: v, mode: "insensitive" as const } })), { provider_profile_id: { in: byPerson } }] } : {}) },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  const profiles = await prisma.providerProfile.findMany({ where: { id: { in: raw.map((r) => r.provider_profile_id) } }, select: { id: true, person: { select: { id: true, first_name: true, last_name: true } } } });
  const byId = new Map(profiles.map((p) => [p.id, p.person]));
  const rows = (await Promise.all(raw.map((r) => effectiveRates(byId.get(r.provider_profile_id)?.id ?? null, [r])))).flat();
  return rows.flatMap((r) => {
    const p = byId.get(r.provider_profile_id);
    return p ? [{ id: r.id, name: r.name, providerName: `${p.first_name} ${p.last_name}`.trim(), providerPersonId: p.id, type: r.service_type === "SERVICE_BY_AMT" ? ("SERVICE_BY_AMT" as const) : ("SERVICE_BY_QTY" as const), uom: r.uom, rateCents: r.rate_cents ?? 0, expenses: r.expenses }] : [];
  });
}

async function cartRequest(s: PunchoutSessionLive): Promise<string> {
  if (s.work_request_id) return s.work_request_id;
  const id = crypto.randomUUID();
  const wr = await prisma.workRequest.create({
    data: {
      id, wr_number: await nextNumber(PREFIX.WORK_REQUEST, { pAccountId: s.connection.p_account_id }), source: "PUNCHOUT", description: `Punchout ${new Date().toISOString().slice(0, 10)}`,
      buyer_person_id: s.requester_person_id, p_account_id: s.connection.p_account_id, title: `Punchout ${new Date().toISOString().slice(0, 10)}`,
      status: "INCOMPLETE", proposal_access: "INVITE_ONLY", sole_sourced: true, erp_connection_id: s.connection_id,
    },
    select: { id: true },
  });
  await prisma.punchoutSession.update({ where: { id: s.id }, data: { work_request_id: wr.id } });
  return wr.id;
}

export async function addToCart(s: PunchoutSessionLive, input: { serviceId: string; quantity?: number | null; start?: string | null; end?: string | null }) {
  const found = await prisma.providerService.findFirst({ where: { id: input.serviceId, active: true, published_at: { not: null } } });
  const svc = found ? (await effectiveRates((await prisma.providerProfile.findUnique({ where: { id: found.provider_profile_id }, select: { person_id: true } }))?.person_id ?? null, [found]))[0] : null;
  // TX-E006: the line carries the type's commodity code (Service Taxonomy), else the service's own, else the default.
  const typeCode = svc?.service_type_id ? (await prisma.serviceType.findUnique({ where: { id: svc.service_type_id }, select: { commodity_code: true } }))?.commodity_code : null;
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
      unspsc_code: typeCode ?? svc.unspsc_code ?? DEFAULT_UNSPSC, uom: byQty ? svc.uom ?? "HOUR" : null, quantity: qty, unit_price_cents: byQty ? svc.rate_cents : null, amount_cents: byQty ? null : svc.rate_cents,
      provider_person_id: profile.person.id, provider_service_id: svc.id, status: "ASSIGNED",
      service_start: input.start ? new Date(input.start) : null, service_end: input.end ? new Date(input.end) : null,
    },
  });
}

export type CartProduct = { id: string; title: string; providerName: string; priceCents: number; byQty: boolean };

/** SH-E004: service products at their listed price, alongside services. */
export async function searchProducts(q: string): Promise<CartProduct[]> {
  const term = q.trim();
  const rows = await prisma.serviceProduct.findMany({
    where: { status: "PUBLISHED", price_cents: { not: null }, ...(term ? { OR: [...searchVariants(term).map((v) => ({ title: { contains: v, mode: "insensitive" as const } })), { providerProfile: { person: { OR: [{ first_name: { contains: term, mode: "insensitive" } }, { last_name: { contains: term, mode: "insensitive" } }] } } }] } : {}) },
    orderBy: { sort_order: "asc" },
    take: 50,
    select: { id: true, title: true, price_cents: true, pricing_type: true, providerProfile: { select: { person: { select: { first_name: true, last_name: true } } } } },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, providerName: `${r.providerProfile.person.first_name} ${r.providerProfile.person.last_name}`.trim(), priceCents: r.price_cents ?? 0, byQty: r.pricing_type === "HOURLY" || r.pricing_type === "TM" }));
}

export async function addProductToCart(s: PunchoutSessionLive, input: { productId: string; quantity?: number | null }) {
  const p = await prisma.serviceProduct.findFirst({ where: { id: input.productId, status: "PUBLISHED", price_cents: { not: null } }, select: { id: true, title: true, price_cents: true, pricing_type: true, serviceType: { select: { commodity_code: true } }, providerProfile: { select: { person: { select: { id: true, first_name: true, last_name: true } } } } } });
  if (!p?.price_cents) throw new Error("That service product isn't available");
  const qty = Math.floor(Number(input.quantity ?? 1));
  if (!qty || qty < 1 || qty > 10000) throw new Error("Enter a quantity");
  const byQty = p.pricing_type === "HOURLY" || p.pricing_type === "TM";
  const person = p.providerProfile.person;
  const wrId = await cartRequest(s);
  const n = await prisma.workRequestLine.count({ where: { work_request_id: wrId } });
  // An amount line carries only its amount; the quantity is amount ÷ the product's price when returned.
  await prisma.workRequestLine.create({
    data: {
      work_request_id: wrId, line_number: n + 1, transaction_type: byQty ? "SERVICE_BY_QTY" : "SERVICE_BY_AMT", description: `${p.title} — ${person.first_name} ${person.last_name}`.trim(),
      unspsc_code: p.serviceType?.commodity_code ?? DEFAULT_UNSPSC, uom: byQty ? "HOUR" : null, quantity: byQty ? qty : null, unit_price_cents: byQty ? p.price_cents : null, amount_cents: byQty ? null : p.price_cents * qty,
      provider_person_id: person.id, service_product_id: p.id, status: "ASSIGNED",
    },
  });
}

export async function removeFromCart(s: PunchoutSessionLive, lineId: string) {
  if (!s.work_request_id) return;
  await prisma.workRequestLine.deleteMany({ where: { id: lineId, work_request_id: s.work_request_id, work_order_id: null } });
}

export async function cartLines(s: PunchoutSessionLive) {
  if (!s.work_request_id) return [];
  const lines = await prisma.workRequestLine.findMany({ where: { work_request_id: s.work_request_id }, orderBy: { line_number: "asc" } });
  const ids = lines.filter((l) => l.service_product_id && l.transaction_type === "SERVICE_BY_AMT").map((l) => l.service_product_id!);
  const price = new Map((await prisma.serviceProduct.findMany({ where: { id: { in: ids } }, select: { id: true, price_cents: true } })).map((p) => [p.id, p.price_cents ?? 0]));
  return lines.map((l) => {
    const unit = l.service_product_id ? price.get(l.service_product_id) : undefined;
    const ea = unit && l.amount_cents && l.amount_cents % unit === 0 ? l.amount_cents / unit : undefined;
    return { ...l, eaQuantity: ea };
  });
}

/** The PunchOutOrderMessage: one ItemIn per work request line (amount lines as 1 × amount). */
export function orderMessageXml(
  s: { buyer_cookie: string; connection: { from_domain: string; from_identity: string; to_identity: string; to_domain: string } },
  lines: { id: string; line_number: number; transaction_type: string; description: string; unspsc_code: string | null; uom: string | null; quantity: unknown; unit_price_cents: number | null; amount_cents: number | null; provider_service_id: string | null; service_product_id?: string | null; eaQuantity?: number }[],
  currency = "USD",
  opts?: { payloadId?: string; timestamp?: string }
) {
  const money = (c: number) => (c / 100).toFixed(2);
  let total = 0;
  const items = lines.map((l) => {
    const byQty = l.transaction_type !== "SERVICE_BY_AMT";
    const qty = byQty ? Number(l.quantity ?? 0) : l.eaQuantity ?? 1;
    const unit = byQty ? l.unit_price_cents ?? 0 : Math.round((l.amount_cents ?? 0) / qty);
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
  if (!lines.length) throw new Error("Add something to the cart before returning it to your ERP");
  const xml = orderMessageXml(s, lines);
  const pid = /payloadID="([^"]+)"/.exec(xml)?.[1] ?? `pom-${Date.now()}`;
  await prisma.$transaction([
    prisma.workRequest.update({ where: { id: s.work_request_id! }, data: { status: "PENDING_APPROVAL", submitted_at: new Date(), erp_returned_at: new Date() } }),
    prisma.punchoutSession.update({ where: { id: s.id }, data: { returned_at: new Date() } }),
  ]);
  await logMessage({ connectionId: s.connection_id, direction: "OUT", type: "PUNCHOUT_ORDER", payloadId: pid, status: "PROCESSED", body: xml, workRequestId: s.work_request_id, response: "Posted by the requester's browser to BrowserFormPost" });
  return { url: s.browser_form_post_url, xml };
}
