import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { uploadProfilePhoto, StorageError, MAX_PHOTO_BYTES } from "@/lib/storage";

/**
 * POST /api/provider/package-image — cover image for a package (brief_V).
 *
 * Reuses the public profile-photos bucket and its validated uploader: a package
 * cover is shown on the buyer-facing catalog, so it is public by nature — the
 * same visibility as a profile photo, unlike résumés or certificates.
 *
 * OWNER-SCOPED: the folder key comes from the session's own Person.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const person = await prisma.person.findUnique({
    where: { user_id: gate.userId },
    select: { id: true },
  });
  if (!person) {
    return NextResponse.json({ error: "No profile for this user" }, { status: 404 });
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
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "That image is larger than 5 MB." },
      { status: 413 }
    );
  }

  try {
    const url = await uploadProfilePhoto(person.id, {
      type: file.type,
      size: file.size,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof StorageError) {
      const status =
        e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error("[package-image] upload failed:", e);
    return NextResponse.json({ error: "Could not upload that image." }, { status: 500 });
  }
}
