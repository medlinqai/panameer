import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getCommunityWeb } from "@/lib/community-web";

export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  try {
    const web = await getCommunityWeb(gate);
    return NextResponse.json(web, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[community] web read failed:", e);
    return NextResponse.json({ error: "Could not read your community." }, { status: 500 });
  }
}
