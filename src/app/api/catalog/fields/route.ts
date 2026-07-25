import { NextResponse } from "next/server";
import { getProviderFields } from "@/lib/catalog";

/**
 * GET /api/catalog/fields — the provider category / field picker (brief_P /
 * E013). Seeded ERP taxonomy, ERP pinned above AI. Public reference data.
 */
export async function GET() {
  return NextResponse.json({ fields: await getProviderFields() });
}
