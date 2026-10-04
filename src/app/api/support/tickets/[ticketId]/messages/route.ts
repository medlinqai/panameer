import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { postMessage, SupportError } from "@/lib/support";
import { canAdminister } from "@/lib/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const { ticketId } = await params;
  const body = await request.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body : "";

  try {
    await postMessage(viewer, ticketId, text, canAdminister(viewer) ? "panameer" : "user");
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SupportError) {
      const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[support] reply failed:", e);
    return NextResponse.json({ error: "Could not post that reply" }, { status: 500 });
  }
}
