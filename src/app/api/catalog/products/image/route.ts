import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_BYTES, StorageError, uploadProfilePhoto } from "@/lib/storage";

// MC-E006: one Service Product picture → public URL (the product saves the list of URLs).
export async function POST(req: Request) {
  const viewer = await guardApi("canProvideServices");
  if (viewer instanceof NextResponse) return viewer;
  const p = await prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } });
  if (!p) return NextResponse.json({ error: "No provider profile" }, { status: 404 });
  const file = await req.formData().then((f) => f.get("file")).catch(() => null);
  if (!(file instanceof File)) return NextResponse.json({ error: "No picture was uploaded" }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "That picture is larger than 5 MB." }, { status: 413 });
  try {
    const url = await uploadProfilePhoto(`service-products/${p.id}`, { type: file.type, size: file.size, bytes: await file.arrayBuffer() });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400 });
    return NextResponse.json({ error: "Could not upload that picture." }, { status: 500 });
  }
}
