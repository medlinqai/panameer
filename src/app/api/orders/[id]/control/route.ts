import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { controlOrder, OrderError } from "@/lib/orders";

const BODY = z.object({ action: z.enum(["HOLD", "RELEASE_HOLD", "FREEZE", "UNFREEZE", "CLOSE", "REOPEN", "FINALLY_CLOSE"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  const body = BODY.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  try {
    return NextResponse.json(await controlOrder(gate, id, body.data.action));
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[orders] control failed:", e);
    return NextResponse.json({ error: "Could not change that order" }, { status: 500 });
  }
}
