import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { homeFor } from "@/lib/home-for";

export async function GET() {
  const viewer = await getSessionViewer();
  return NextResponse.json({ home: homeFor(viewer) });
}
