import { NextResponse } from "next/server";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { WorkRequestError } from "@/lib/work-request";
import type { Viewer } from "@/lib/access";
/* ⚠ `assignProvider` IS NO LONGER IMPORTED HERE (`P2-A8-E684` WS-F) — this
   route stopped setting the provider. ⚠⚠ THE FUNCTION STAYS ON DISK and is
   still how `assignProviderDirectly` reaches the same field; only this caller
   went (`E164`).
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   import { assignProvider, removeLine, updateLine } from "@/lib/work-request-lines"; */
import { removeLine, updateLine } from "@/lib/work-request-lines";
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
    /*
      ── ⚠⚠⚠ THIS ROUTE NO LONGER SETS THE PROVIDER (`P2-A8-E684` WS-F) ──────

      ⚠⚠⚠ **THREE WRITERS OF *"WHO IS DOING THIS WORK"* EXISTED, AND THIS WAS
      THE WEAK ONE.** `selectProvider` writes the provider **with the winning
      bid's rate**, the line status, the award and the request status;
      `assignProviderDirectly` writes the provider **with an explicit rate**.
      ⚠⚠ **THIS WROTE THE NAME AND NOTHING ELSE** — producing a line with a
      provider, no price, no line status and no bid, which is the half-state the
      other two are careful to avoid. ⚠ It could also put a different provider
      on line 2 while `selectProvider` had awarded line 1, and could silently
      contradict an award afterwards. **Two answers to one question, on the
      screen a buyer signs a contract from** (`E585`).

      ⚠⚠ **RULED BY SCOTT, 2026-09-27:** *"narrow the line PATCH to stop
      accepting `providerPersonId` in that same commit — the capability must
      never be absent (rule 5). Enforce in the route, not the component."*
      ⚠⚠⚠ **SO IT IS REFUSED HERE, NOT HIDDEN IN THE UI** — the picker is a
      convenience and the route is the boundary, which is the rule this file's
      own sibling comment already states.
      ⚠ **THE CAPABILITY IS NOT ABSENT FOR ONE COMMIT:** `/select` and `/assign`
      ship in this same change, and the direct route is the one that replaces
      this call for the buyer who has no proposals.

      ⚠ `assignProvider` in `lib/work-request-lines.ts` STAYS ON DISK (`E164`)
      and is still what `assignProviderDirectly` reaches the same field through.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   if ("providerPersonId" in body) {
      //     return NextResponse.json(
      //       await assignProvider(g.viewer, id, lineId, body.providerPersonId ?? null)
      //     );
      //   }
    */
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
