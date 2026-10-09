import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OrderError } from "@/lib/orders";
import { proposeChange } from "@/lib/change-orders";

const VAL = z.union([z.string().max(20000), z.number(), z.null()]);
const BODY = z.object({
  header: z.record(z.enum(["not_to_exceed_cents", "period_start", "period_end", "sow_text"]), VAL).optional(),
  lines: z.array(z.object({ lineId: z.string().uuid(), fields: z.record(z.enum(["quantity", "unit_price_cents", "amount_cents", "service_start", "service_end"]), VAL) })).max(200).optional(),
});

// O-E003: the customer raises a change order.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = BODY.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Those changes aren't valid" }, { status: 400 });
  try {
    return NextResponse.json({ id: await proposeChange(gate, id, body.data) });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400 });
    console.error("[orders] change order failed:", e);
    return NextResponse.json({ error: "Could not send that change order" }, { status: 500 });
  }
}
