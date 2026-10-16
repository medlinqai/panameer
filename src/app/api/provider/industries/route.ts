import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { addIndustries, industryRequired, hasIndustry } from "@/lib/industry";
import { recomputeCompleteness } from "@/lib/onboarding";

const Body = z.object({ ids: z.array(z.string().uuid()).min(1).max(20) });

// IN-E002: "Which industries have you worked in?" — adds INDUSTRY specializations (keeps the rest). Owner-scoped.
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Pick at least one industry" }, { status: 400 });
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) return NextResponse.json({ error: "No provider profile" }, { status: 404 });
  const n = await addIndustries(p.id, b.data.ids);
  await recomputeCompleteness(p.id);
  return NextResponse.json({ ok: true, added: n });
}

/** Scott 10-16: Get Found asks for industries in the run — required?, already has?, the list. */
export async function GET() {
  const viewer = await guardApi("authenticated");
  if (viewer instanceof NextResponse) return viewer;
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true, person_id: true } });
  if (!p) return NextResponse.json({ required: false, has: false, industries: [] });
  const [required, has, industries] = await Promise.all([
    industryRequired(p.person_id),
    hasIndustry(p.id),
    prisma.specialization.findMany({ where: { kind: "INDUSTRY" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return NextResponse.json({ required, has, industries });
}
