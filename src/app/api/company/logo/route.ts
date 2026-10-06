import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { uploadCompanyLogo, StorageError, MAX_PHOTO_BYTES } from "@/lib/storage";
import { extractLogoPalette } from "@/lib/logoHueExtract";
import sharp from "sharp";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return NextResponse.json({ error: "No person record" }, { status: 404 });
  }

  let file: File | null = null;
  let companyId: string | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
    const cid = form.get("companyId");
    if (typeof cid === "string" && cid) companyId = cid;
  } catch {
    return NextResponse.json({ error: "Could not read the upload" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file was uploaded" }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "That image is larger than 5 MB. Choose a smaller file." },
      { status: 413 }
    );
  }

  if (companyId) {
    const isAdmin = await prisma.companyMembership.findFirst({
      where: {
        person_id: person.id,
        company_id: companyId,
        role: "ADMIN",
        status: "APPROVED",
      },
      select: { id: true },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only a company admin can change its logo" },
        { status: 403 }
      );
    }
  }

  try {
    let bytes = await file.arrayBuffer();
    let type = file.type;
    // The logo bucket takes raster images only: an SVG is drawn to a 1200px-wide PNG (transparency kept, nothing cut).
    if (type === "image/svg+xml") {
      const png = await sharp(Buffer.from(bytes), { density: 300 }).resize({ width: 1200, withoutEnlargement: false }).png().toBuffer();
      bytes = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
      type = "image/png";
    }
    const url = await uploadCompanyLogo(companyId ?? person.id, { type, size: bytes.byteLength, bytes });
    if (companyId) {
      // Upload is the only place colors are read; a company that never picked a color gets the first logo color.
      const palette = await extractLogoPalette(Buffer.from(bytes)).catch(() => [] as string[]);
      const co = await prisma.company.findUnique({ where: { id: companyId }, select: { brand_hue: true } });
      await prisma.company.update({
        where: { id: companyId },
        data: { logo_url: url, logo_palette: palette.length ? palette : Prisma.DbNull, ...(!co?.brand_hue && palette[0] ? { brand_hue: palette[0] } : {}) },
      });
      return NextResponse.json({ ok: true, logoUrl: url, palette });
    }
    return NextResponse.json({ ok: true, logoUrl: url });
  } catch (e) {
    if (e instanceof StorageError) {
      const status = e.code === "NOT_CONFIGURED" ? 503 : e.code === "TOO_LARGE" ? 413 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[company] logo upload failed:", e);
    return NextResponse.json({ error: "Could not upload that image." }, { status: 500 });
  }
}

// Undo: put back the logo this company had before. Admin-only, and only this company's own stored files (or none).
export async function PUT(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const body = (await request.json().catch(() => null)) as { companyId?: string; logoUrl?: string | null } | null;
  if (!body?.companyId) return NextResponse.json({ error: "Missing company" }, { status: 400 });
  const admin = await prisma.companyMembership.findFirst({
    where: { person: { user_id: gate.userId }, company_id: body.companyId, role: "ADMIN", status: "APPROVED" },
    select: { id: true },
  });
  if (!admin) return NextResponse.json({ error: "Only a company admin can change its logo" }, { status: 403 });
  const url = body.logoUrl ?? null;
  if (url !== null && !url.includes(`/company-logos/${body.companyId}/`)) {
    return NextResponse.json({ error: "That isn't one of this company's logos" }, { status: 400 });
  }
  let palette: string[] = [];
  if (url) {
    const img = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    if (img) palette = await extractLogoPalette(Buffer.from(img)).catch(() => []);
  }
  await prisma.company.update({ where: { id: body.companyId }, data: { logo_url: url, logo_palette: palette.length ? palette : Prisma.DbNull } });
  return NextResponse.json({ ok: true, logoUrl: url });
}
