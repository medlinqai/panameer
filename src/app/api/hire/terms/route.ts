import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { SignGateError } from "@/lib/your-path";
import { confirmTerms, HireTermsError, type HireTerms } from "@/lib/hire-direct";

// HS-E005: confirm the Hire Terms → Work Request line → Create Work Order (or back to the ERP for ERP-origin requests).
export async function POST(request: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const t = (await request.json().catch(() => null)) as HireTerms | null;
  if (!t?.jobId || !t.providerPersonId) return NextResponse.json({ error: "That hire couldn't be read." }, { status: 400 });
  try {
    return NextResponse.json(await confirmTerms(gate, t));
  } catch (e) {
    if (e instanceof SignGateError) return NextResponse.json({ error: e.message, gate: e.gate }, { status: 409 });
    if (e instanceof HireTermsError || (e instanceof Error && (e.name === "SourcingError" || e.name === "WorkRequestError"))) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[hire] terms failed:", e);
    return NextResponse.json({ error: "Could not create that work order." }, { status: 500 });
  }
}
