import { NextResponse } from "next/server";
import {
  getSkillsForRoleType,
  getSkillsForPillar,
  getSkillsForField,
} from "@/lib/catalog";

/**
 * GET /api/catalog/skills
 *   ?roleTypeId=…&pillarId=…  → skills in one (Role, Domain) FIELD
 *                               (brief_R — the provider wizard, step 8)
 *   ?pillarId=…               → skills across a domain, any role
 *   ?roleTypeId=…             → skills in one RoleType (Settings, Work Request)
 *
 * Public reference data.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pillarId = params.get("pillarId");
  const roleTypeId = params.get("roleTypeId");

  if (roleTypeId && pillarId) {
    return NextResponse.json({
      skills: await getSkillsForField(roleTypeId, pillarId),
    });
  }
  if (pillarId) {
    return NextResponse.json({ skills: await getSkillsForPillar(pillarId) });
  }
  if (roleTypeId) {
    return NextResponse.json({ skills: await getSkillsForRoleType(roleTypeId) });
  }
  return NextResponse.json(
    { error: "pillarId and/or roleTypeId is required" },
    { status: 400 }
  );
}
