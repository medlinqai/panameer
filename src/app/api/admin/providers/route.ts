import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getAdminProviders } from "@/lib/admin";

/** GET /api/admin/providers — 4-stage funnel counts + providers table. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await getAdminProviders(gate));
  } catch (e) {
    console.error("[admin] providers failed:", e);
    return NextResponse.json({ error: "Could not load providers" }, { status: 500 });
  }
}
