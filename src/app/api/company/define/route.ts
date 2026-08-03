import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { defineCompany } from "@/lib/company";

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  taxType: z.enum([
    "C_CORP",
    "S_CORP",
    "LLC",
    "PARTNERSHIP",
    "SOLE_PROP_INDIVIDUAL",
    "NONPROFIT",
  ]),
  website: z.string().trim().max(300).nullish(),
  logoUrl: z.string().trim().max(600).nullish(),
  attestation: z.boolean(),
  companyTos: z.boolean(),
});

/**
 * POST /api/company/define — create the company and become its admin.
 *
 * `authenticated`, then owner-scoped: the acting person comes from the session.
 * The attestation and the company-ToS acceptance are required by the lib rather
 * than only by the form — a checkbox is not a control.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await defineCompany(gate, parsed.data)) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[company] define failed:", e);
    return NextResponse.json({ error: "Could not create that company" }, { status: 500 });
  }
}
