import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { uploadCertificationFile, StorageError } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/**
 * POST /api/provider/certification-file — store a certificate (brief_U / E044).
 *
 * OWNER-SCOPED: the profile comes from the session, so the object always lands
 * in the caller's own folder in the PRIVATE `certifications` bucket. Returns
 * the object path, which the certification row then references.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const profile = await prisma.providerProfile.findFirst({
    where: { person: { user_id: gate.userId } },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No provider profile" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That file is larger than 5 MB." }, { status: 413 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Attach a PDF or an image." }, { status: 400 });
  }

  try {
    const path = await uploadCertificationFile(profile.id, {
      name: file.name,
      type: file.type,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json({ ok: true, path, name: file.name });
  } catch (e) {
    if (e instanceof StorageError) {
      const status = e.code === "NOT_CONFIGURED" ? 503 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[certification-file] upload failed:", e);
    return NextResponse.json({ error: "Could not upload." }, { status: 500 });
  }
}
