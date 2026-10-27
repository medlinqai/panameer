import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { extractTheme } from "@/lib/company-theme";
import { adminCompanyId, storeThemeImage } from "@/lib/company-theme-admin";
import { MAX_PHOTO_BYTES } from "@/lib/storage";

export const runtime = "nodejs";

// WA-E005 Option A: a screenshot of the company's Oracle home page → header, accent and background colours (+ the logo corner).
// Nothing is saved to the theme here; the admin approves or adjusts on the preview first.
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const companyId = await adminCompanyId(gate.userId);
  if (!companyId) return NextResponse.json({ error: "Only a company admin can set the theme." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Upload a screenshot (PNG or JPG)." }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES * 2) return NextResponse.json({ error: "That screenshot is larger than 10 MB." }, { status: 413 });
  try {
    const t = await extractTheme(Buffer.from(await file.arrayBuffer()));
    const logoUrl = t.logoPng ? await storeThemeImage(companyId, t.logoPng).catch(() => null) : null;
    return NextResponse.json({ header: t.header, accent: t.accent, background: t.background, logoUrl });
  } catch {
    return NextResponse.json({ error: "We couldn't read that image. Try a PNG or JPG screenshot." }, { status: 400 });
  }
}
