import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { uploadProfilePhoto, StorageError, MAX_PHOTO_BYTES } from "@/lib/storage";

/**
 * POST /api/admin/learn/image — one image for any level of the curriculum
 * (path cover, course/section/lesson thumbnail).
 *
 * Reuses the public profile-photos bucket and its validated uploader rather
 * than standing up a sixth bucket. Learn art is public by nature — it renders
 * on the logged-out catalog — so it wants exactly the visibility a profile
 * photo has, and it inherits the same type/size checks for free.
 *
 * The folder key is the literal "learn" rather than a person id: these images
 * belong to the platform, not to the admin who happened to upload them, and a
 * path's cover shouldn't move or vanish when a staff member leaves.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

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
    return NextResponse.json({ error: "That image is larger than 5 MB." }, { status: 413 });
  }

  try {
    const url = await uploadProfilePhoto("learn", {
      type: file.type,
      size: file.size,
      bytes: await file.arrayBuffer(),
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof StorageError) {
      const code = e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ error: e.message }, { status: code });
    }
    console.error("[admin/learn] image upload failed:", e);
    return NextResponse.json({ error: "Could not upload that image." }, { status: 500 });
  }
}
