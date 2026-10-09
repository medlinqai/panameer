import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PUNCHOUT_COOKIE, sessionFor } from "@/lib/erp/punchout";
import { addToCart, removeFromCart, returnCart } from "@/lib/erp/cart";
import { esc } from "@/lib/erp/cxml";

// X-E003: cart actions inside a punchout session. "return" answers with a page that posts the cart to the ERP.
export async function POST(req: Request) {
  const s = await sessionFor((await cookies()).get(PUNCHOUT_COOKIE)?.value);
  const back = (err?: string) => NextResponse.redirect(new URL(`/punchout${err ? `?error=${encodeURIComponent(err)}` : ""}`, req.url), 303);
  if (!s) return back();
  const f = await req.formData();
  const action = String(f.get("action") ?? "");
  try {
    if (action === "add") {
      await addToCart(s, { serviceId: String(f.get("serviceId") ?? ""), quantity: f.get("quantity") ? Number(f.get("quantity")) : null, start: (f.get("start") as string) || null, end: (f.get("end") as string) || null });
      return back();
    }
    if (action === "remove") {
      await removeFromCart(s, String(f.get("lineId") ?? ""));
      return back();
    }
    if (action === "return") {
      const { url, xml } = await returnCart(s);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Returning to your ERP…</title></head><body onload="document.forms[0].submit()"><form method="post" action="${esc(url)}"><input type="hidden" name="cxml-urlencoded" value="${esc(xml)}"><noscript><button>Return to Your ERP</button></noscript></form><p style="font-family:sans-serif">Returning your cart to your ERP…</p></body></html>`;
      const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      res.cookies.delete({ name: PUNCHOUT_COOKIE, path: "/punchout" });
      return res;
    }
  } catch (e) {
    return back((e as Error).message);
  }
  return back("Unknown action");
}
