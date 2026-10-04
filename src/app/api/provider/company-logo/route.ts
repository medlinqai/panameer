import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { suggestCompanyLogos, logoApiConfigured } from "@/lib/company-logo";

export async function GET(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (name.trim().length < 2) {
    return NextResponse.json({ suggestions: [], configured: logoApiConfigured() });
  }

  try {
    return NextResponse.json({
      suggestions: await suggestCompanyLogos(name),
      // Lets the UI explain "keyless fallback only" vs a full lookup.
      configured: logoApiConfigured(),
    });
  } catch (e) {
    console.error("[logo] suggestion failed (non-fatal):", e);
    return NextResponse.json({ suggestions: [], configured: logoApiConfigured() });
  }
}
