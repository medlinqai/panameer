import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { themeProblem } from "@/lib/dynamic-branding";

export const runtime = "nodejs";

async function adminCompanyId(userId: string): Promise<string | null> {
  const m = await prisma.companyMembership.findFirst({
    where: { person: { user_id: userId }, role: "ADMIN", status: "APPROVED" },
    select: { company_id: true },
  });
  return m?.company_id ?? null;
}

/** PUT — persist { brandHue, recipeId }. */
export async function PUT(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const companyId = await adminCompanyId(gate.userId);
  if (!companyId) {
    return NextResponse.json({ error: "Not a company admin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const brandHue = body?.brandHue ?? null;
  const recipeId = body?.recipeId ?? null;
  const enabled: boolean | undefined = typeof body?.enabled === "boolean" ? body.enabled : undefined;

  // Both null = Reset to Panameer Default. Contrast is adjusted by brandTokens, so only a bad hex is refused.
  if (brandHue !== null || recipeId !== null) {
    const problem = themeProblem(brandHue, recipeId);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  const reset = brandHue === null && recipeId === null;
  await prisma.company.update({
    where: { id: companyId },
    data: { brand_hue: brandHue, theme_recipe: recipeId, ...(reset ? { theme_enabled: null } : enabled !== undefined ? { theme_enabled: enabled } : {}) },
  });

  return NextResponse.json({ ok: true });
}
