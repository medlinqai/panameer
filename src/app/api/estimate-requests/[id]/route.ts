import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { declineRequest, EstimateRequestError, withdrawRequest } from "@/lib/estimate-requests";

const BODY = z.object({ action: z.enum(["decline", "withdraw"]), reason: z.string().max(2000).optional() });

// EST-E002/E003: the provider declines (reason required) or the buyer withdraws an open request.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const b = BODY.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    if (b.data.action === "decline") await declineRequest(gate, id, b.data.reason ?? "");
    else await withdrawRequest(gate, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof EstimateRequestError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400 });
    throw e;
  }
}
