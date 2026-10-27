import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardApi } from "@/lib/guard";
import { isValidHex } from "@/lib/themeRecipes";
import { adminCompanyId, storeThemeImage } from "@/lib/company-theme-admin";

export const runtime = "nodejs";

// WA-E005: approve Your Theme (from the screenshot preview or entered by hand) — or DELETE to go back to Panameer's.
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const companyId = await adminCompanyId(gate.userId);
  if (!companyId) return NextResponse.json({ error: "Only a company admin can set the theme." }, { status: 403 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Nothing was sent." }, { status: 400 });
  const header = String(form.get("header") ?? ""), accent = String(form.get("accent") ?? ""), background = String(form.get("background") ?? "");
  if (!isValidHex(header) || !isValidHex(accent)) return NextResponse.json({ error: "Enter the header and accent colours as hex, like #1F4E79." }, { status: 400 });
  if (background && !isValidHex(background)) return NextResponse.json({ error: "The background colour must be hex, like #F5F5F5." }, { status: 400 });
  try {
    const logo = form.get("logo"), bg = form.get("backgroundImage");
    if (logo instanceof File && logo.size && !["image/png", "image/svg+xml"].includes(logo.type)) return NextResponse.json({ error: "The logo must be an SVG or PNG." }, { status: 400 });
    const logoUrl = logo instanceof File && logo.size ? await storeThemeImage(companyId, logo) : String(form.get("logoUrl") ?? "") || null;
    const bgUrl = bg instanceof File && bg.size ? await storeThemeImage(companyId, bg) : String(form.get("backgroundUrl") ?? "") || null;
    await prisma.company.update({ where: { id: companyId }, data: { theme_header_hex: header.toLowerCase(), theme_accent_hex: accent.toLowerCase(), theme_background_hex: background ? background.toLowerCase() : null, theme_logo_url: logoUrl, theme_background_url: bgUrl, theme_approved_at: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't save the theme." }, { status: 400 });
  }
}

export async function DELETE() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const companyId = await adminCompanyId(gate.userId);
  if (!companyId) return NextResponse.json({ error: "Only a company admin can set the theme." }, { status: 403 });
  await prisma.company.update({ where: { id: companyId }, data: { theme_header_hex: null, theme_accent_hex: null, theme_background_hex: null, theme_logo_url: null, theme_background_url: null, theme_approved_at: null } });
  return NextResponse.json({ ok: true });
}
