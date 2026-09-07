import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import type { Viewer } from "@/lib/access";
import { assignProvider, removeLine, updateLine } from "@/lib/work-request-lines";
import { errStatus } from "../route";

/**
 * PATCH / DELETE /api/work-requests/[id]/lines/[lineId] (`P1-J4-E392` WS-2).
 *
 * ⚠⚠ THE `lineId` IS NOT TRUSTED. Every handler below resolves ownership of the
 * REQUEST from the session and then scopes the write to
 * `{ id: lineId, work_request_id }` — so a line id belonging to another tenant
 * updates zero rows and returns NOT_FOUND rather than touching anything.
 *
 * ⚠ PATCH DOES TWO THINGS BECAUSE THEY ARE ONE RESOURCE. `{ providerPersonId }`
 * assigns or clears the provider; anything else is a line edit. A separate
 * `/assign` route would be a second place ownership has to be re-proved.
 */
async function gated(): Promise<
  { ok: true; viewer: Viewer } | { ok: false; response: NextResponse }
> {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return { ok: false, response: gate };
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
        { status: 403 }
      ),
    };
  }
  return { ok: true, viewer: gate };
}

function fail(e: unknown, what: string) {
  if (e instanceof WorkRequestError)
    return NextResponse.json({ error: e.message, code: e.code }, { status: errStatus(e.code) });
  if (e instanceof Error && e.name === "SpineError")
    return NextResponse.json({ error: e.message, code: "INVALID" }, { status: 400 });
  console.error(`[work-request] ${what} failed:`, e);
  return NextResponse.json({ error: `Could not ${what}` }, { status: 500 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const g = await gated();
  if (!g.ok) return g.response;
  const { id, lineId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  try {
    if ("providerPersonId" in body) {
      return NextResponse.json(
        await assignProvider(g.viewer, id, lineId, body.providerPersonId ?? null)
      );
    }
    return NextResponse.json(await updateLine(g.viewer, id, lineId, body));
  } catch (e) {
    return fail(e, "update that line");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const g = await gated();
  if (!g.ok) return g.response;
  const { id, lineId } = await params;
  try {
    return NextResponse.json(await removeLine(g.viewer, id, lineId));
  } catch (e) {
    return fail(e, "remove that line");
  }
}
