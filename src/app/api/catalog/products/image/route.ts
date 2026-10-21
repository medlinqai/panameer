import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_BYTES, StorageError, uploadProfilePhoto } from "@/lib/storage";
import { PRODUCT_IMAGE_REJECTED, productImageAcceptable } from "@/lib/photo-check";

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
    // PA-E003: the same AI check as profile photos (tuned for products), then a square on white (contain, never cropped off).
    const raw = await file.arrayBuffer();
    if (!(await productImageAcceptable(raw, file.type))) return NextResponse.json({ error: PRODUCT_IMAGE_REJECTED }, { status: 422 });
    const sharp = (await import("sharp")).default;
    const square = await sharp(Buffer.from(raw)).rotate().resize(1200, 1200, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).flatten({ background: "#ffffff" }).jpeg({ quality: 86 }).toBuffer();
    const bytes = square.buffer.slice(square.byteOffset, square.byteOffset + square.byteLength) as ArrayBuffer;
    const url = await uploadProfilePhoto(`service-products/${p.id}`, { type: "image/jpeg", size: square.byteLength, bytes });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof StorageError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400 });
    return NextResponse.json({ error: "Could not upload that picture." }, { status: 500 });
  }
}
