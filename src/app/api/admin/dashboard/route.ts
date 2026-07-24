import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getAdminDashboard } from "@/lib/admin";

/** GET /api/admin/dashboard — stat tiles + Usage & Adoption. Admin only. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await getAdminDashboard(gate));
  } catch (e) {
    console.error("[admin] dashboard failed:", e);
    return NextResponse.json({ error: "Could not load dashboard" }, { status: 500 });
  }
}
