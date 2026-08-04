import { NextResponse } from "next/server";
import {
  getSkillsForRoleType,
  getSkillsForRoleTypes,
  getSkillsForPillar,
  getSkillsForField,
} from "@/lib/catalog";

/**
 * GET /api/catalog/skills
 *   ?roleTypeId=…&pillarId=…  → skills in one (Role, Domain) FIELD
 *                               (brief_R — the provider wizard, step 8)
 *   ?pillarId=…               → skills across a domain, any role
 *   ?roleTypeId=…             → skills in one RoleType (Settings, Work Request)
 *   ?roleTypeIds=a,b          → the UNION across several roles (WS3 skills page)
 *
 * Public reference data.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const pillarId = params.get("pillarId");
  const roleTypeId = params.get("roleTypeId");
  const roleTypeIds = (params.get("roleTypeIds") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  // The union comes first: a multi-role provider asking for several roles must
  // not be answered with just the first one.
  if (roleTypeIds.length > 0) {
    return NextResponse.json({ skills: await getSkillsForRoleTypes(roleTypeIds) });
  }

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
