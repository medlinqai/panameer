import { NextResponse } from "next/server";
import { getRegions } from "@/lib/catalog";

/** GET /api/catalog/regions — the Region lookup (public reference data). */
export async function GET() {
  return NextResponse.json({ regions: await getRegions() });
}
