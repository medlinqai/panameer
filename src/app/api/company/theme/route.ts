import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { extractLogoHues } from "@/lib/logoHueExtract";
import { isValidHex, RECIPE_IDS } from "@/lib/themeRecipes";

export const runtime = "nodejs";

async function adminCompanyId(userId: string): Promise<string | null> {
  const m = await prisma.companyMembership.findFirst({
    where: { person: { user_id: userId }, role: "ADMIN", status: "APPROVED" },
    select: { company_id: true },
  });
  return m?.company_id ?? null;
}

/** POST — a logo image in, candidate brand colours out. Saves nothing. */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const companyId = await adminCompanyId(gate.userId);
  if (!companyId) {
    return NextResponse.json({ error: "Not a company admin" }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const entry = (await request.formData()).get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Expected a file" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Expected a file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const hues = await extractLogoHues(buffer);
  return NextResponse.json({ hues });
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

  if (brandHue !== null && !isValidHex(brandHue)) {
    return NextResponse.json({ error: "brandHue must be a #rrggbb hex" }, { status: 400 });
  }
  if (recipeId !== null && !RECIPE_IDS.includes(recipeId)) {
    return NextResponse.json({ error: "Unknown theme" }, { status: 400 });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { brand_hue: brandHue, theme_recipe: recipeId },
  });

  return NextResponse.json({ ok: true });
}
