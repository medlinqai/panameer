import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { guardApi } from "@/lib/guard";
import { SignGateError } from "@/lib/your-path";
import { confirmTerms, HireTermsError, type HireTerms } from "@/lib/hire-direct";
import { currentPunchin } from "@/lib/erp/punchin-live";

// HS-E005: confirm the Hire Terms → Work Request line → Create Work Order (or back to the ERP for ERP-origin requests).
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const t = (await request.json().catch(() => null)) as HireTerms | null;
  if (!t?.jobId || !t.providerPersonId) return NextResponse.json({ error: "That hire couldn't be read." }, { status: 400 });
  try {
    // PI-E004: punched in → the hire goes into the punch-in cart (back to the ERP for approval), not straight to an Order.
    const p = await currentPunchin();
    if (p?.state === "live" && p.session) {
      const { addHireToCart } = await import("@/lib/erp/cart");
      try {
        const r = await addHireToCart(p.session, { jobId: t.jobId, providerPersonId: t.providerPersonId, unitPriceCents: t.unitPriceCents, start: t.start, end: t.end, hours: (t as { hours?: number | null }).hours ?? null });
        return NextResponse.json({ punchin: true, erpName: p.erpName, hours: r.hours });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't add to your cart.", erpName: p.erpName }, { status: 400 });
      }
    }
    return NextResponse.json(await confirmTerms(gate, t));
  } catch (e) {
    if (e instanceof SignGateError) return NextResponse.json({ error: e.message, gate: e.gate }, { status: 409 });
    if (e instanceof HireTermsError || (e instanceof Error && (e.name === "SourcingError" || e.name === "WorkRequestError"))) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[hire] terms failed:", e);
    return apiError(e, "hire/terms");
  }
}
