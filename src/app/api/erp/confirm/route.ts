import { NextResponse } from "next/server";
import { confirmOnboarding } from "@/lib/erp/self-onboard-notify";

// EO-E004: Confirm Your Company & Set a Password — addressed by the one-time token in the welcome email (no session).
export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const r = await confirmOnboarding(String(b.token ?? ""), {
      password: String(b.password ?? ""), companyName: String(b.companyName ?? ""), line1: String(b.line1 ?? ""), city: String(b.city ?? ""),
      state: String(b.state ?? ""), postalCode: String(b.postalCode ?? ""), country: String(b.country ?? ""), acceptTerms: b.acceptTerms === true,
    });
    return NextResponse.json({ ok: true, email: r.email });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't confirm — try again." }, { status: 400 });
  }
}
