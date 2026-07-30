import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  createArtifact,
  deleteArtifact,
  listArtifacts,
} from "@/lib/artifacts";
import { OnboardingError } from "@/lib/onboarding";

/**
 * Artifacts on the viewer's own Employers / Projects (PJv2 WS4 / E078a).
 *
 *   GET                        → every artifact on this profile
 *   POST { action: "create", artifact }
 *        { action: "delete", artifactId }
 *
 * OWNER-SCOPED in the lib: the parent id is re-checked against the session's own
 * profile, so a foreign employer/project id resolves to nothing.
 */
export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ artifacts: await listArtifacts(gate) });
  } catch (e) {
    return handle(e, "Could not load artifacts");
  }
}

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => null);
  try {
    switch (body?.action) {
      case "create":
        await createArtifact(gate, body.artifact ?? {});
        break;
      case "delete":
        await deleteArtifact(gate, String(body.artifactId));
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, artifacts: await listArtifacts(gate) });
  } catch (e) {
    return handle(e, "Could not save that artifact");
  }
}

function handle(e: unknown, fallback: string) {
  if (e instanceof OnboardingError) {
    const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  console.error("[artifacts]", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
