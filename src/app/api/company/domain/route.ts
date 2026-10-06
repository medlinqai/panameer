import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { setCompanyDomain } from "@/lib/company-domain-join";
import { OnboardingError } from "@/lib/onboarding";

// Admin-only: claim the company's email domain (must be the admin's own verified, non-free-mail domain).
const Body = z.object({ domain: z.string().trim().min(3).max(253) });

export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a domain like yourcompany.com" }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await setCompanyDomain(gate, parsed.data.domain)) });
  } catch (e) {
    if (e instanceof OnboardingError) return NextResponse.json({ error: e.message }, { status: e.code === "GATE_UNMET" ? 403 : 400 });
    throw e;
  }
}
