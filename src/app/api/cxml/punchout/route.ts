import { handlePosr } from "@/lib/erp/punchout";

// X-E002: cXML PunchOutSetupRequest from a customer's ERP. Authenticated by From/Sender identity + shared secret.
export async function POST(req: Request) {
  const xml = await req.text();
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  try {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const r = await handlePosr(xml, origin, ip);
    return new Response(r.body, { status: r.status, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  } catch (e) {
    console.error("[cxml] punchout setup failed:", e);
    return new Response('<?xml version="1.0"?><cXML><Response><Status code="500" text="Internal Server Error"/></Response></cXML>', { status: 500, headers: { "Content-Type": "text/xml; charset=utf-8" } });
  }
}
