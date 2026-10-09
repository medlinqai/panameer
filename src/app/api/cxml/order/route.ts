import { handleOrderRequest } from "@/lib/erp/orders";

// X-E004: cXML OrderRequest (new / update / delete) from a customer's ERP. Idempotent on payloadID.
export async function POST(req: Request) {
  try {
    const r = await handleOrderRequest(await req.text());
    return new Response(r.body, { status: r.status, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  } catch (e) {
    console.error("[cxml] order request failed:", e);
    return new Response('<?xml version="1.0"?><cXML><Response><Status code="500" text="Internal Server Error"/></Response></cXML>', { status: 500, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }
}
