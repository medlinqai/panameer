import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  listEmployers,
  createEmployer,
  updateEmployer,
  deleteEmployer,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/employers";
import { OnboardingError } from "@/lib/onboarding";

/**
 * Employers + their nested Projects (brief_U).
 *
 *   GET                                   → the viewer's employers
 *   POST { action: "createEmployer", employer }
 *        { action: "updateEmployer", employerId, employer }
 *        { action: "deleteEmployer", employerId }
 *        { action: "createProject",  employerId, project }
 *        { action: "updateProject",  projectId, project }
 *        { action: "deleteProject",  projectId }
 *
 * OWNER-SCOPED throughout: the lib resolves the profile from the session and
 * re-checks every client-supplied id against it, so a foreign id resolves to
 * nothing rather than to someone else's record.
 */
export async function GET() {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  try {
    return NextResponse.json({ employers: await listEmployers(gate) });
  } catch (e) {
    return handle(e, "Could not load employers");
  }
}

export async function POST(request: Request) {
  const gate = await guardApi("canProvideServices");
  if (gate instanceof NextResponse) return gate;
  const viewer = gate;

  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    switch (action) {
      case "createEmployer":
        await createEmployer(viewer, body.employer ?? {});
        break;
      case "updateEmployer":
        await updateEmployer(viewer, String(body.employerId), body.employer ?? {});
        break;
      case "deleteEmployer":
        await deleteEmployer(viewer, String(body.employerId));
        break;
      case "createProject":
        await createProject(viewer, String(body.employerId), body.project ?? {});
        break;
      case "updateProject":
        await updateProject(viewer, String(body.projectId), body.project ?? {});
        break;
      case "deleteProject":
        await deleteProject(viewer, String(body.projectId));
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    // Always hand back the fresh list so the client never guesses at state.
    return NextResponse.json({ ok: true, employers: await listEmployers(viewer) });
  } catch (e) {
    return handle(e, "Could not save");
  }
}

function handle(e: unknown, fallback: string) {
  if (e instanceof OnboardingError) {
    const status = e.code === "NOT_A_PROVIDER" ? 404 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }
  console.error("[employers]", e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
