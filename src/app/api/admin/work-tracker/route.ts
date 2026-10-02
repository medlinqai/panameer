import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import {
  WorkTrackerError,
  createShipped,
  deleteShipped,
  setGateCriterion,
  setPhaseDates,
  setStageStatus,
  setTaskState,
  updateShipped,
} from "@/lib/work-tracker/admin";

/**
 * POST /api/admin/work-tracker — every Work Tracker edit (`P2-ALL-E752`).
 *
 * ⚠⚠ **ONE ROUTE, ONE GUARD.** `guardApi("canAdminister")` runs once, before the
 * action is even read, so a new action cannot ship without the gate — the shape
 * `E386` used for the mail transport, applied to a write surface. ⚠ The admin
 * layout's `guardPage` and `route-access.ts` are the other two layers.
 *
 * ⚠ **NO ACTOR ID IS ACCEPTED FROM THE BODY.** The `Viewer` is what `guardApi`
 * returned; `admin.ts` reads `updated_by` off it (load-bearing rule 5).
 */
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
        });
        return NextResponse.json({ ok: true });

      case "stage": {
        const n = await setStageStatus(gate, String(body.phase ?? ""), String(body.stage ?? ""), body.status);
        return NextResponse.json({ ok: true, changed: n });
      }

      case "gate":
        await setGateCriterion(gate, String(body.gateId ?? ""), Number(body.criterionIndex), body.value);
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

      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof WorkTrackerError) {
      /* ⚠ The message names the id or the value that was refused, because an
         admin who cannot tell WHICH field was rejected retypes the whole form. */
      return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[admin] work-tracker write failed:", e);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
