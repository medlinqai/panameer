import { NextResponse } from "next/server";
import { getSpecializations } from "@/lib/catalog";

/**
 * GET /api/catalog/specializations — the Specialization vocabulary (brief_R),
 * grouped into products / methodologies / industries. Public reference data.
 */
export async function GET() {
  return NextResponse.json({ groups: await getSpecializations() });
}
