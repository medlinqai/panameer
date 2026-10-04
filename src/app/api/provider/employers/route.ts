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
  moveProject,
  convertEmployerToProject,
  convertProjectToEmployer,
  projectLoss,
} from "@/lib/employers";
import { OnboardingError } from "@/lib/onboarding";

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
      case "createProject": {
        const raw = body.employerId;
        if (raw === undefined) {
          return NextResponse.json(
            {
              error:
                'A project must say which company it belongs to. Send "employerId": null for a project with no company.',
            },
            { status: 400 }
          );
        }
        await createProject(
          viewer,
          raw === null ? null : String(raw),
          body.project ?? {}
        );
        break;
      }
        break;
      case "updateProject":
        await updateProject(viewer, String(body.projectId), body.project ?? {});
        break;
      case "deleteProject":
        await deleteProject(viewer, String(body.projectId));
        break;

      case "moveProject":
        await moveProject(
          viewer,
          String(body.projectId),
          body.employerId ? String(body.employerId) : null
        );
        break;

      case "employerToProject": {
        const r = await convertEmployerToProject(viewer, String(body.employerId), {
          targetEmployerId: String(body.targetEmployerId),
          clientName: String(body.clientName ?? ""),
        });
        return NextResponse.json({ employers: await listEmployers(viewer), ...r });
      }

      case "projectToEmployer": {
        const r = await convertProjectToEmployer(viewer, String(body.projectId), {
          name: String(body.name ?? ""),
        });
        return NextResponse.json({ employers: await listEmployers(viewer), ...r });
      }

      case "projectLoss":
        return NextResponse.json({ loss: await projectLoss(viewer, String(body.projectId)) });
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
