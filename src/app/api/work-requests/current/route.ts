import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getCurrentDraft, WorkRequestError } from "@/lib/work-request";

/**
 * GET /api/work-requests/current — the buyer's most recent DRAFT (for resume),
 * or null. Gated canHireTalent; PAccount-scoped in the lib.
 */
export async function GET() {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ draft: await getCurrentDraft(gate) });
  } catch (e) {
    if (e instanceof WorkRequestError) {
      const status = e.code === "NOT_A_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[work-request] current failed:", e);
    return NextResponse.json({ error: "Could not load draft" }, { status: 500 });
  }
}
