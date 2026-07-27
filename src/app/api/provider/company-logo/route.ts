import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { suggestCompanyLogos, logoApiConfigured } from "@/lib/company-logo";

/**
 * GET /api/provider/company-logo?name=Acme — logo SUGGESTIONS for a company
 * name (brief_U / E043).
 *
 * Suggestions only: the provider accepts, changes or removes one, and nothing
 * is ever auto-applied. Returns an empty list rather than an error when no
 * provider is configured or every lookup fails, so the employer form degrades
 * to plain manual entry instead of breaking.
 *
 * Gated to providers — it's an authenticated convenience, not a public
 * logo-proxy anyone can hammer.
 */
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
