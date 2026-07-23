import { NextResponse } from "next/server";
import { getSkillsForRoleType } from "@/lib/catalog";

/**
 * GET /api/catalog/skills?roleTypeId=… — skills within one RoleType (the
 * choices shown after the provider picks their single main category). Public
 * reference data.
 */
export async function GET(request: Request) {
  const roleTypeId = new URL(request.url).searchParams.get("roleTypeId");
  if (!roleTypeId) {
    return NextResponse.json({ error: "roleTypeId is required" }, { status: 400 });
  }
  return NextResponse.json({ skills: await getSkillsForRoleType(roleTypeId) });
}
