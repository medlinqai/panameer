import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { listExperts } from "@/lib/learn-admin";

/** GET /api/admin/learn/experts?q= — Person picker for path/lesson experts. */
export async function GET(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const q = new URL(request.url).searchParams.get("q") ?? undefined;
  try {
    return NextResponse.json({ experts: await listExperts(q) });
  } catch (e) {
    console.error("[admin/learn] experts failed:", e);
    return NextResponse.json({ error: "Could not load people" }, { status: 500 });
  }
}
