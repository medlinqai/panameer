import { NextResponse } from "next/server";
import { z } from "zod";
import { guardApi } from "@/lib/guard";
import { OnboardingError } from "@/lib/onboarding";
import { joinCompany } from "@/lib/company";

const schema = z.object({
  companyId: z.string().uuid(),
  attestation: z.boolean(),
});

/**
 * POST /api/company/join — request to join a company.
 *
 * Auto-approves on a work-email domain match, otherwise creates a PENDING
 * request. The DECISION is made server-side from the session user's own email;
 * the client never says whether it matched.
 */
export async function POST(request: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await joinCompany(gate, parsed.data)) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    console.error("[company] join failed:", e);
    return NextResponse.json({ error: "Could not join that company" }, { status: 500 });
  }
}
