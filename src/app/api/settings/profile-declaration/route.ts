import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { setLineDeclaration } from "@/lib/profile-declarations";
import { OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/settings/profile-declaration — "I have none", for one profile line
 * (`P2-J3-E590` WS-B).
 *
 * ⚠ Body: `{ line: "certifications", declared: true }`.
 * ⚠⚠ OWNER-SCOPED — the profile is resolved from the session inside
 * `setLineDeclaration`, never accepted from the body (load-bearing rule 5).
 * ⚠ A line outside the closed five is REFUSED with 400, not ignored: a client
 * that believes it saved something must not be told it did.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      line?: unknown;
      declared?: unknown;
    };
    const result = await setLineDeclaration(
      gate,
      body.line,
      body.declared !== false
    );
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[settings] profile-declaration failed:", e);
    return NextResponse.json(
      { error: "Could not save that." },
      { status: 500 }
    );
  }
}
