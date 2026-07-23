import { NextResponse } from "next/server";
import { getRoleTypes } from "@/lib/catalog";

/** GET /api/catalog/role-types — the RoleType lookup (public reference data). */
export async function GET() {
  return NextResponse.json({ roleTypes: await getRoleTypes() });
}
