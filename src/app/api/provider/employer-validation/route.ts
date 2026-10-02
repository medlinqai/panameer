import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { requestEmployerValidation } from "@/lib/employer-validation";
import { OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/provider/employer-validation — ask somebody at a job's company to
 * confirm the employment (`P2-A1.1-E747`, WS-B).
 *
 * ⚠ Body: `{ employerId, contactEmail? }`. ⚠⚠ OWNER-SCOPED IN THE LIB: the
 * employer is re-checked against the session's own profile, so an id arriving
 * from the client can never reach a stranger's row or mail their contact.
 * ⚠⚠⚠ Every guard the project route relies on — the domain check, the
 * own-domain refusal and the shared daily cap — lives in the lib, so anything
 * that can POST here gets the same refusals the modal shows.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => null);
  const employerId = body?.employerId;
  if (!employerId || typeof employerId !== "string") {
    return NextResponse.json({ error: "Missing employerId" }, { status: 400 });
  }
  const contactEmail =
    typeof body?.contactEmail === "string" ? body.contactEmail : undefined;

  try {
    const res = await requestEmployerValidation(gate, employerId, {
      contactEmail,
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[employer-validation] request failed:", e);
    return NextResponse.json(
      { error: "Could not send that request." },
      { status: 500 }
    );
  }
}
