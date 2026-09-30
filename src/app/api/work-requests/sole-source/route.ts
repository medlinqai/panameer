import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { hireSoleSourced, HireError } from "@/lib/sole-source";

/**
 * ── ⚠⚠⚠ `POST /api/work-requests/sole-source` (`P2-A8-E719`) ─────────────────
 *
 * ⚠ The `Hire` button on `/providers/[id]`. Body: `{ providerPersonId }`. Returns the work
 * request to land on, and whether an existing draft was reopened.
 *
 * ⚠⚠ **`guardApi("canHireTalent")` IS THE SAME CAPABILITY THE BUTTON IS RENDERED ON**, and it
 * is checked here as well as there — **the UI decides what to draw, never who may act.** A
 * member who is not a buyer gets 403 from this route whatever the page rendered.
 * ⚠⚠⚠ **AND IT IS CHECKED A THIRD TIME INSIDE `resolveBuyer`**, which throws `NOT_A_BUYER` on
 * the same column. That is not redundancy for its own sake: the guard protects the ROUTE, and
 * the writer protects itself from every other caller it may acquire later.
 *
 * ⚠ It sits under `/api/work-requests/` with the other writers of this model rather than under
 * `/api/providers/`, because what it creates is a work request; the provider is an argument.
 */
export async function POST(req: Request) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;

  let providerPersonId = "";
  try {
    const body = (await req.json()) as { providerPersonId?: unknown };
    providerPersonId = typeof body.providerPersonId === "string" ? body.providerPersonId : "";
  } catch {
    /* ⚠ A malformed body is a 400 with a reason, never a 500 — the client sees what to fix. */
    return NextResponse.json({ error: "Expected JSON", code: "BAD_BODY" }, { status: 400 });
  }

  try {
    const result = await hireSoleSourced(gate, providerPersonId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HireError) {
      const status = e.code === "NOT_A_BUYER" || e.code === "OWN_PROFILE" ? 403 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    /* ⚠⚠ `resolveBuyer` throws `WorkRequestError`, not `HireError`, and its `NOT_A_BUYER` must
       not fall through to a 500 — a refused buyer is a 403 with a reason. */
    const code = (e as { code?: string })?.code;
    if (code === "NOT_A_BUYER") {
      return NextResponse.json({ error: "Not a buyer", code }, { status: 403 });
    }
    console.error("[sole-source] failed:", e);
    return NextResponse.json({ error: "Could not start the request" }, { status: 500 });
  }
}
