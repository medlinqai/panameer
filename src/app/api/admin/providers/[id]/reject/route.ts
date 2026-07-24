import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { rejectProvider, AdminError } from "@/lib/admin";

/**
 * POST /api/admin/providers/[id]/reject — reject Validation (brief_M).
 * Sets validation_status=REJECTED; base marketplace visibility unchanged.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await rejectProvider(gate, id));
  } catch (e) {
    if (e instanceof AdminError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("[admin] reject failed:", e);
    return NextResponse.json({ error: "Could not reject" }, { status: 500 });
  }
}
