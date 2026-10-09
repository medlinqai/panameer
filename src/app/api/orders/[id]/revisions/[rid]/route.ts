import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OrderError } from "@/lib/orders";
import { decideChange } from "@/lib/change-orders";

const BODY = z.object({ decision: z.enum(["ACCEPT", "REJECT"]), note: z.string().max(2000).optional().nullable() });

// O-E003: the provider accepts or rejects a change order.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; rid: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id, rid } = await params;
  const body = BODY.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose accept or reject" }, { status: 400 });
  try {
    return NextResponse.json(await decideChange(gate, id, rid, body.data.decision, body.data.note));
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400 });
    console.error("[orders] change decision failed:", e);
    return NextResponse.json({ error: "Could not record that decision" }, { status: 500 });
  }
}
