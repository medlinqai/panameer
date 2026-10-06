import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import type { Viewer } from "@/lib/access";
import { removeLine, updateLine } from "@/lib/work-request-lines";
import { errStatus } from "../route";

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
    // THIS ROUTE NO LONGER SETS THE PROVIDER WS-F)
    if ("providerPersonId" in body) {
      return NextResponse.json(
        {
          error:
            "Choose a provider by selecting their proposal, or assign one directly with their rate.",
          code: "USE_SELECTION",
        },
        { status: 400 }
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
