import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { sendTest } from "@/lib/work-tests";

/**
 * ── ⚠⚠⚠ POST /api/work-requests/[id]/test (`P2-A8-E683a` WS-E) ────────────
 *
 * ⚠⚠⚠ **`work-tests.ts` IS 345 LINES WITH FOUR EXPORTED FUNCTIONS AND HAD ZERO
 * IMPORTERS IN `src/`** — measured at WS-E's premise check, the same shape as
 * the interview writer beside it.
 *
 * ⚠⚠ **A TEST IS A `LearnAssessment`, WHICH IS WHY THE BODY NAMES ONE.** The
 * buyer picks a published path test; `sendTest` refuses a missing or
 * unpublished one through `assertTestRequestLine`, so this route validates the
 * SHAPE and the writer validates the RULE. ⚠ Measured today: **2 published
 * assessments, 6 draft** — the picker offers the two, and that number is a
 * query, never a literal.
 *
 * ⚠⚠⚠ **SENDING A TEST GRANTS NO ATTEMPTS AND CONSUMES NONE**, and an existing
 * pass is REUSED rather than re-sat — `work-tests.ts` records why in as many
 * words: *"or the test becomes a toll gate rather than a credential."* This
 * route adds nothing to that and must not.
 *
 * ⚠ **OPTIONAL, AND NOT A PRECONDITION OF WS-F** — `selection.ts` reads no
 * `TestRequest`, and `check:work-chain` fails if it ever does.
 */
const bodySchema = z
  .object({
    providerPersonId: z.string().uuid(),
    /** ⚠ Which test. `sendTest` refuses one that is missing or unpublished. */
    learnAssessmentId: z.string().uuid(),
    /** ⚠ An ISO date; the writer turns it into a `Date`. Optional by design. */
    respondsBy: z.string().max(40).nullish(),
    message: z.string().max(2000).nullish(),
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
      { error: "That test couldn't be read.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      await sendTest(gate, {
        workRequestId: id,
        providerPersonId: parsed.data.providerPersonId,
        learnAssessmentId: parsed.data.learnAssessmentId,
        respondsBy: parsed.data.respondsBy ? new Date(parsed.data.respondsBy) : null,
        message: parsed.data.message ?? null,
      })
    );
  } catch (e) {
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_BUYER" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[work-tests] send failed:", e);
    return NextResponse.json({ error: "Could not send that test." }, { status: 500 });
  }
}
