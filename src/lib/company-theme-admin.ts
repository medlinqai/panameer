import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { uploadCompanyLogo, MAX_PHOTO_BYTES } from "@/lib/storage";

/** WA-E005: the company this person administers (themes are an admin's call). */
export async function adminCompanyId(userId: string): Promise<string | null> {
  const m = await prisma.companyMembership.findFirst({ where: { person: { user_id: userId }, role: "ADMIN", status: "APPROVED" }, select: { company_id: true } });
  return m?.company_id ?? null;
}

/** Store an uploaded image in the company-logo bucket (SVG drawn to PNG, as the logo route does) and return its URL. */
export async function storeThemeImage(companyId: string, file: File | Buffer, type = "image/png"): Promise<string> {
  let bytes: Buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  let mime = Buffer.isBuffer(file) ? type : file.type;
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error("That image is larger than 5 MB. Choose a smaller file.");
  if (mime === "image/svg+xml") { bytes = await sharp(bytes, { density: 300 }).resize({ width: 1200 }).png().toBuffer(); mime = "image/png"; }
  return uploadCompanyLogo(companyId, { type: mime, size: bytes.length, bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
}
