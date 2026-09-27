import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { requestInterview } from "@/lib/interviews";

/**
 * ── ⚠⚠⚠ POST /api/work-requests/[id]/interview (`P2-A8-E683a` WS-E) ───────
 *
 * ⚠⚠⚠ **THE WRITER HAS EXISTED SINCE `E388` AND NOTHING COULD REACH IT.**
 * Measured at WS-E's premise check: `interviews.ts` is 322 lines with five
 * exported functions and **zero importers in `src/`** — its only importer is
 * `scripts/check-interviews.ts`. ⚠ **That is the fourth premise in this brief
 * with the same shape: already written, no door.**
 *
 * ⚠⚠ **OPTIONAL, AND NOT A PRECONDITION OF ANYTHING.** The brief: *"each
 * optional, each with its `notify()`. Neither may be made a precondition of
 * WS-F."* ⚠ Measured and asserted: `selection.ts` reads neither
 * `InterviewRequest` nor `TestRequest`, and `check:work-chain` fails if it ever
 * does. **A buyer may select a provider having interviewed nobody.**
 *
 * ⚠ `requestInterview` IS IDEMPOTENT — an open request returns
 * `{ created: false }` rather than a second row, so a double click cannot
 * produce two interviews.
 * ⚠⚠ `checkTransact` is called for the sibling routes' reason and **currently
 * decides nothing** (`guard.ts:117` returns `{ ok: true }`). It is wired so the
 * company gate covers this when it exists. **It is not a guard today.**
 */
const bodySchema = z
  .object({
    /** ⚠ Whose interview. The route re-checks they proposed; the picker is a convenience. */
    providerPersonId: z.string().uuid(),
    /** ⚠ `InterviewMode` has exactly three values; a fourth is a schema change. */
    mode: z.enum(["VIDEO", "PHONE", "ONSITE"]).nullish(),
    /** ⚠ `requestInterview` defaults to 30 when this is absent. */
    durationMinutes: z.number().int().positive().max(480).nullish(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canHireTalent");
  if (gate instanceof NextResponse) return gate;
  const transact = await checkTransact(gate);
  if (!transact.ok) {
    return NextResponse.json(
      { error: TRANSACT_MESSAGE[transact.reason], code: transact.reason },
      { status: 403 }
    );
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That interview request couldn't be read.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await requestInterview(gate, {
        workRequestId: id,
        providerPersonId: parsed.data.providerPersonId,
        mode: parsed.data.mode ?? null,
        durationMinutes: parsed.data.durationMinutes ?? undefined,
      })
    );
  } catch (e) {
    /* ⚠⚠ `SourcingError` CARRIES ITS OWN SENTENCE THROUGH — *"that provider
       hasn't proposed on this work request"* is what the buyer needs to read,
       and "Forbidden" would be the `TRANSACT_MESSAGE` lesson repeated. */
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[interviews] request failed:", e);
    return NextResponse.json(
      { error: "Could not request that interview." },
      { status: 500 }
    );
  }
}
