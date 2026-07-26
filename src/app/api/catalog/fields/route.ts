import { NextResponse } from "next/server";
import { getProviderFieldTree } from "@/lib/catalog";

/**
 * GET /api/catalog/fields — the provider field picker (brief_R / E013).
 *
 * Returns the Role → Domain tree from the authoritative Service Catalog, with
 * ERP-heavy areas first. A provider picks a (Role, Domain) PAIR; the skills
 * step then filters on both. Public reference data.
 */
export async function GET() {
  return NextResponse.json({ roles: await getProviderFieldTree() });
}
