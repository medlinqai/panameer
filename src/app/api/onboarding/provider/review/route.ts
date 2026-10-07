import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { reviewAction, reviewState, searchCatalog, type ReviewAction } from "@/lib/resume/review";

// The member's own résumé review: read it, search the catalog, and save each change as they go.
async function profileId() {
  const viewer = await getSessionViewer();
  if (!viewer) return null;
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  return p?.id ?? null;
}

export async function GET(req: Request) {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const q = new URL(req.url).searchParams.get("skillq");
  if (q !== null) return NextResponse.json({ skills: await searchCatalog(q) });
  return NextResponse.json({ state: await reviewState(id) });
}

const s = z.string().max(300);
const uuid = z.string().uuid();
const Body = z.union([
  z.object({ action: z.literal("remove"), kind: z.enum(["skill", "project", "cert", "edu"]), id: uuid }),
  z.object({ action: z.literal("dismiss"), kind: z.enum(["newSkill", "junk"]), names: z.array(s).max(100) }),
  z.object({ action: z.literal("edit"), kind: z.literal("project"), id: uuid, name: s, client: s }),
  z.object({ action: z.literal("edit"), kind: z.literal("cert"), id: uuid, name: s, issuer: s }),
  z.object({ action: z.literal("edit"), kind: z.literal("edu"), id: uuid, institution: s, degree: s }),
  z.object({ action: z.literal("edit"), kind: z.literal("about"), title: s, overview: z.string().max(4000) }),
  z.object({ action: z.literal("merge"), kind: z.enum(["project", "cert", "edu"]), keepId: uuid, dropIds: z.array(uuid).max(20) }),
  z.object({ action: z.literal("company"), name: s.min(1), choice: z.enum(["EMPLOYER", "PROJECT", "REMOVE"]) }),
  z.object({ action: z.literal("companyMerge"), keep: s.min(1), drop: s.min(1) }),
  z.object({ action: z.literal("keepBoth"), a: s.min(1), b: s.min(1) }),
  z.object({ action: z.literal("addSkill"), skillId: uuid }),
  z.object({ action: z.literal("reread") }),
  z.object({ action: z.literal("commit") }),
]);

export async function POST(req: Request) {
  const id = await profileId();
  if (!id) return NextResponse.json({ error: "No provider profile" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "That didn't look right." }, { status: 400 });
  const r = await reviewAction(id, parsed.data as ReviewAction);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, state: await reviewState(id) });
}
