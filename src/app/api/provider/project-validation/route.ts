import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { requestProjectValidation } from "@/lib/project-validation";
import { OnboardingError } from "@/lib/onboarding";

/**
 * POST /api/provider/project-validation — ask a project's client contact to
 * validate it (brief_project_validation).
 *
 * Body: { projectId }. OWNER-SCOPED in the lib: the project is re-checked
 * against the session's own profile, so this can never be used to email a
 * stranger's client contact.
 */
export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => null);
  const projectId = body?.projectId;
  if (!projectId || typeof projectId !== "string") {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const res = await requestProjectValidation(gate, projectId, {
      origin: new URL(request.url).origin,
    });
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    if (e instanceof OnboardingError) {
      const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[project-validation] request failed:", e);
    return NextResponse.json(
      { error: "Could not send that request." },
      { status: 500 }
    );
  }
}
