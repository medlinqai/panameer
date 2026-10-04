import { NextResponse } from "next/server";
import {
  getSkillsForRoleType,
  getSkillsForRoleTypes,
  getSkillsForPillar,
  getSkillsForField,
} from "@/lib/catalog";

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
