import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getRoster, CoordinatorError } from "@/lib/coordinator";

/** GET /api/coordinator/roster — represented providers + pending invites. */
export async function GET() {
  const gate = await guardApi("canCoordinate");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await getRoster(gate));
  } catch (e) {
    if (e instanceof CoordinatorError) {
      const status = e.code === "NOT_A_COORDINATOR" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[coordinator] roster failed:", e);
    return NextResponse.json({ error: "Could not load roster" }, { status: 500 });
  }
}
