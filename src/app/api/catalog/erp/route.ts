import { NextResponse } from "next/server";
import { getCatalogTree } from "@/lib/catalog";

/**
 * GET /api/catalog/erp — the ERP catalog as a nested tree (pillars → offerings
 * → applications) plus role types, regions, and engagement types.
 *
 * Public: this is shared marketplace vocabulary (reference data), so it takes
 * no auth and no PAccount scope. Thin handler; all logic lives in the lib.
 */
export async function GET() {
  const tree = await getCatalogTree("ERP");
  if (!tree) {
    return NextResponse.json(
      { error: "ERP catalog not seeded" },
      { status: 404 }
    );
  }
  return NextResponse.json(tree);
}
