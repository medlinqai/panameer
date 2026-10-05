import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { applyCompanySort, companySortState } from "@/lib/resume/company-sort";

// The member's own "Companies we found" list: read it, and save their sort on Continue.
async function profileId() {
  const viewer = await getSessionViewer();
  if (!viewer) return null;
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  return p?.id ?? null;
}

export async function GET() {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  return NextResponse.json({ state: await companySortState(id) });
}

const Body = z.object({
  choices: z.array(z.object({ name: z.string().min(1).max(300), choice: z.enum(["EMPLOYER", "PROJECT", "REMOVE"]).nullable(), employer: z.string().max(300).nullable().optional() })).max(200),
});

export async function POST(req: Request) {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const result = await applyCompanySort(id, parsed.data.choices);
  return NextResponse.json({ ok: true, ...result, state: await companySortState(id) });
}
