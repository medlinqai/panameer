import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { validateProvider, AdminError } from "@/lib/admin";

/**
 * POST /api/admin/providers/[id]/validate — grant Validation (brief_M).
 * Sets validation_status=VALIDATED + validated_at; base visibility unchanged.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  try {
    return NextResponse.json(await validateProvider(gate, id));
  } catch (e) {
    if (e instanceof AdminError && e.code === "NOT_FOUND") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error("[admin] validate failed:", e);
    return NextResponse.json({ error: "Could not validate" }, { status: 500 });
  }
}
