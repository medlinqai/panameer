import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { uploadProfilePhoto, StorageError, MAX_PHOTO_BYTES } from "@/lib/storage";

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
