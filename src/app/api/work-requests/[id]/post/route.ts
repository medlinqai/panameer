import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { postWorkRequest, WorkRequestError } from "@/lib/work-request";

/**
 * POST /api/work-requests/[id]/post — post a DRAFT (→ POSTED + posted_at).
 * Gated canHireTalent; PAccount-scoped; enforces the required subset.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await postWorkRequest(gate, id));
  } catch (e) {
    if (e instanceof WorkRequestError) {
      const status =
        e.code === "NOT_A_BUYER" ? 403 : e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[work-request] post failed:", e);
    return NextResponse.json({ error: "Could not post request" }, { status: 500 });
  }
}
