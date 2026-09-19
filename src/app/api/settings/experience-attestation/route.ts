import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { saveAttestations } from "@/lib/experience-attestation";
import { OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/settings/experience-attestation — the 3-year experience claim
 * (`P2-J2-E563` WS-B item 8).
 *
 * ⚠⚠ IT CAPTURES A CLAIM AND CREATES NOTHING. No service product is
 * auto-created by this brief; the four open decisions in
 * `service_products_and_provider_quality.md` are unruled and this route must
 * not be the place somebody settles them.
 *
 * ⚠ OWNER-SCOPED, per load-bearing rule 5 — the profile is resolved from the
 * session inside `saveAttestations`, never accepted from the body. The body
 * carries claims only.
 *
 * ⚠ Body: `{ claims: [{ category, years }] }`. A category outside the closed
 * four is REFUSED, not dropped.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    const body = (await request.json().catch(() => ({}))) as { claims?: unknown };
    return NextResponse.json({ attestations: await saveAttestations(gate, body.claims) });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] experience-attestation failed:", e);
    return NextResponse.json(
      { error: "Could not save your experience" },
      { status: 500 }
    );
  }
}
