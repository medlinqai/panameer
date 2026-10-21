import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import { EstimateRequestError } from "@/lib/estimate-requests";
import { awardEstimate, estimateCandidates, openEstimateEvent } from "@/lib/estimate-events";
import { EstimateError } from "@/lib/estimates";
import { SignGateError } from "@/lib/your-path";

// ES-E002: GET = who to ask (for a product / Product Type); POST (multipart) = open the Estimate Event.
export async function GET(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const u = new URL(request.url);
  return NextResponse.json(await estimateCandidates(gate, { productId: u.searchParams.get("product"), productTypeId: u.searchParams.get("type"), providerPersonId: u.searchParams.get("provider") }));
}

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  // ES-E005: JSON { action: "award", eventId, estimateId }.
  if (request.headers.get("content-type")?.includes("application/json")) {
    const b = (await request.json().catch(() => ({}))) as { action?: string; eventId?: string; estimateId?: string };
    try {
      if (b.action === "award") return NextResponse.json(await awardEstimate(gate, String(b.eventId ?? ""), String(b.estimateId ?? "")));
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (e) {
      if (e instanceof WorkRequestError || e instanceof EstimateError) return NextResponse.json({ error: e.message }, { status: 400 });
      if (e instanceof SignGateError) return NextResponse.json({ error: `Before accepting, finish: ${e.gate.items.filter((i) => !i.done).map((i) => `${i.company}: ${i.item}`).join(" · ")}`, code: "SIGN_GATE" }, { status: 409 });
      throw e;
    }
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const str = (k: string) => String(form.get(k) ?? "").trim();
  const dollars = (k: string) => (str(k) ? Math.round(Number(str(k).replace(/[^0-9.]/g, "")) * 100) || null : null);
  try {
    const out = await openEstimateEvent(gate, {
      title: str("title"), description: str("description"), category: str("category") || null, productTypeId: str("type") || null, notes: str("notes") || null,
      neededBy: str("neededBy") || null, budgetMinCents: dollars("budgetMin"), budgetMaxCents: dollars("budgetMax"),
      providerPersonIds: form.getAll("provider").map(String), productId: str("product") || null, hours: Number(str("hours") || 48),
    }, form.getAll("files").filter((f): f is File => f instanceof File).slice(0, 3));
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof WorkRequestError || e instanceof EstimateRequestError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[estimate-events] failed:", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
