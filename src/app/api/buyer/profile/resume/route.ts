import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { MAX_DOC_BYTES } from "@/lib/resume/extract";
import { buyerProfileFor, fillBuyerFromResume } from "@/lib/buyer-profile";

export const runtime = "nodejs";
export const maxDuration = 180;

// Buyer "Fill from résumé": one read, buyer fields only; the file itself is not kept.
export async function POST(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const p = await prisma.person.findUnique({ where: { user_id: gate.userId }, select: { id: true } });
  if (!p) return NextResponse.json({ error: "No profile" }, { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: "That file is larger than 5 MB. Please upload a smaller file." }, { status: 413 });
  try {
    const r = await fillBuyerFromResume(p.id, { bytes: Buffer.from(await file.arrayBuffer()), mimeType: file.type, fileName: file.name });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
    return NextResponse.json({ found: r.found, profile: await buyerProfileFor(p.id) });
  } catch (e) {
    console.error("[buyer-resume] failed", e);
    return NextResponse.json({ error: "We couldn't read that file. Please try again." }, { status: 500 });
  }
}
