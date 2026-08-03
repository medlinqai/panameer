import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { uploadCompanyLogo, StorageError, MAX_PHOTO_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * POST /api/company/logo — upload a company logo (E168).
 *
 * TWO CALLERS, ONE ENDPOINT, and the difference matters:
 *  · DEFINING a company — there is no company yet, so `companyId` is absent and
 *    the file is stored under the caller's PERSON id. The URL comes back and is
 *    posted with the define call.
 *  · an EXISTING company — `companyId` is present and the caller must hold an
 *    APPROVED ADMIN membership on it. Anything else is somebody re-branding a
 *    company they don't run.
 */
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
    const url = await uploadCompanyLogo(companyId ?? person.id, {
      type: file.type,
      size: file.size,
      bytes: await file.arrayBuffer(),
    });
    if (companyId) {
      await prisma.company.update({ where: { id: companyId }, data: { logo_url: url } });
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
