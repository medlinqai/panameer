import { NextResponse } from "next/server";
import { getSkillsForRoleType, getSkillsForPillar } from "@/lib/catalog";

/**
 * GET /api/catalog/skills?pillarId=…   — skills within one FIELD (brief_P /
 *                                        E014, the provider wizard)
 * GET /api/catalog/skills?roleTypeId=… — skills within one RoleType (the
 *                                        pre-brief_P scoping, still used by
 *                                        Settings and the Work Request wizard)
 *
 * Public reference data.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pillarId = params.get("pillarId");
  const roleTypeId = params.get("roleTypeId");

  if (pillarId) {
    return NextResponse.json({ skills: await getSkillsForPillar(pillarId) });
  }
  if (roleTypeId) {
    return NextResponse.json({ skills: await getSkillsForRoleType(roleTypeId) });
  }
  return NextResponse.json(
    { error: "pillarId or roleTypeId is required" },
    { status: 400 }
  );
}
