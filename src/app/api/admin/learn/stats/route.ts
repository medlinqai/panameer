import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getLearnStats } from "@/lib/learn-admin";

/** GET /api/admin/learn/stats — library rollup for the Learn console landing. */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json(await getLearnStats());
  } catch (e) {
    console.error("[admin/learn] stats failed:", e);
    return NextResponse.json({ error: "Could not load Learn stats" }, { status: 500 });
  }
}
