import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  WorkTrackerError,
  createRelease,
  createShipped,
  deleteRelease,
  deleteShipped,
  setGateCriterion,
  bulkAssignRelease,
  createCustomTask,
  deleteCustomTask,
  setCurrentPhase,
  setTaskRelease,
  updateCustomTask,
  setPhaseDates,
  setStageStatus,
  setTaskState,
  updateRelease,
  updateShipped,
} from "@/lib/work-tracker/admin";

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    switch (action) {
      case "task":
        await setTaskState(gate, String(body.taskId ?? ""), {
          status: body.status,
          owner: body.owner,
          note: body.note,
          stage: body.stage,
        });
        return NextResponse.json({ ok: true });

      case "stage": {
        const n = await setStageStatus(gate, String(body.phase ?? ""), String(body.stage ?? ""), body.status);
        return NextResponse.json({ ok: true, changed: n });
      }

      case "gate":
        await setGateCriterion(gate, String(body.gateId ?? ""), Number(body.criterionIndex), body.value);
        return NextResponse.json({ ok: true });

      case "current-phase":
        await setCurrentPhase(gate, body.phase === null || body.phase === "" ? null : String(body.phase));
        return NextResponse.json({ ok: true });

      case "task-release":
        await setTaskRelease(
          gate,
          String(body.taskId ?? ""),
          body.releaseId ? String(body.releaseId) : null,
        );
        return NextResponse.json({ ok: true });

      case "bulk-release": {
        const n = await bulkAssignRelease(
          gate,
          {
            phase: body.phase ? String(body.phase) : undefined,
            stage: body.stage ? String(body.stage) : undefined,
            segment: body.segment ? String(body.segment) : undefined,
          },
          body.releaseId ? String(body.releaseId) : null,
        );
        return NextResponse.json({ ok: true, changed: n });
      }

      case "custom-create": {
        const row = await createCustomTask(gate, body);
        return NextResponse.json({ ok: true, id: row.id });
      }

      case "custom-update":
        await updateCustomTask(gate, String(body.id ?? ""), body);
        return NextResponse.json({ ok: true });

      case "custom-delete":
        await deleteCustomTask(String(body.id ?? ""));
        return NextResponse.json({ ok: true });

      case "phase-dates":
        await setPhaseDates(gate, String(body.phase ?? ""), { start: body.start, end: body.end });
        return NextResponse.json({ ok: true });

      case "shipped-create": {
        const row = await createShipped(gate, body);
        return NextResponse.json({ ok: true, id: row.id });
      }

      case "shipped-update":
        await updateShipped(gate, String(body.id ?? ""), body);
        return NextResponse.json({ ok: true });

      case "shipped-delete":
        await deleteShipped(String(body.id ?? ""));
        return NextResponse.json({ ok: true });

      case "release-create": {
        const row = await createRelease(gate, body);
        return NextResponse.json({ ok: true, id: row.id });
      }

      case "release-update":
        await updateRelease(gate, String(body.id ?? ""), body);
        return NextResponse.json({ ok: true });

      case "release-delete":
        await deleteRelease(String(body.id ?? ""));
        return NextResponse.json({ ok: true });

      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof WorkTrackerError) {
      return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[admin] work-tracker write failed:", e);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
