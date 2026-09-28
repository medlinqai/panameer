import { NextResponse } from "next/server";
import { z } from "zod";
import { TRANSACT_MESSAGE } from "@/lib/transact-message";
import { checkTransact, guardApi } from "@/lib/guard";
import { submitProposal } from "@/lib/proposals";

/**
 * ── ⚠⚠⚠ POST /api/work-requests/[id]/propose (`P2-A8-E681` WS-C) ───────────
 *
 * ⚠⚠⚠ **THE WRITER EXISTED AND NOTHING COULD REACH IT.** `lib/proposals.ts`
 * has held `proposal.create` since `E621` WS-A, and its only importers were
 * three `scripts/check-*.ts` gates — measured again at WS-C's premise check.
 * ⚠⚠ `/find-work/[id]` recorded that in its own docblock and deliberately
 * shipped **no propose button**, because *"a control whose handler refuses is a
 * door onto a wall"* (`E579`). ⚠ This route is the handler that ends that.
 *
 * ── ⚠⚠ WHY IT SITS UNDER `/api/work-requests` AND NOT `/api/find-work` ─────
 *
 * ⚠ The resource is the WORK REQUEST and `[id]` means the same thing here as in
 * its five siblings (`post`, `complete`, `invite`, `lines`). ⚠⚠ **THE GUARD IS
 * WHAT DIFFERS, NOT THE RESOURCE:** `invite` is `canHireTalent` because a buyer
 * invites; this is `canProvideServices` because a provider proposes.
 * ⚠⚠⚠ **AND THE EDGE DOES NOT CONTRADICT THAT — MEASURED, BECAUSE `E680` JUST
 * PAID FOR NOT MEASURING IT.** `proxy.ts`'s matcher lists `/work-requests/:path*`,
 * which does **not** match `/api/work-requests/...`, so a provider is NOT bounced
 * by `ROUTE_ACCESS`'s `canHireTalent` entry before reaching this handler. ⚠ The
 * sibling `invite` route is the standing proof of that shape.
 *
 * ⚠ `checkTransact` IS CALLED FOR THE SIBLING'S REASON AND CURRENTLY DECIDES
 * NOTHING — `guard.ts:117` is `void viewer; return { ok: true }`. ⚠⚠ It is wired
 * now so that the company gate, when it is implemented, covers proposing without
 * anybody having to remember this file. **It is not a guard today; do not report
 * it as one.**
 */

/**
 * ⚠⚠ **`.strict()`, SO AN UNKNOWN KEY IS REFUSED RATHER THAN IGNORED.** A
 * misspelled `rate` silently dropping would post a proposal with no price, and
 * the provider would have no way to tell.
 *
 * ⚠⚠⚠ **THE PRICE ARRIVES IN CENTS AND MUST BE AN INTEGER.** `.int()` here and
 * `Number.isInteger` in `writeRate` are the same rule stated twice on purpose —
 * this one gives the provider a 400 with a reason, that one is the invariant the
 * database column needs. ⚠ Money is never a float in this codebase.
 *
 * ⚠ NO CARD, NO ACCOUNT, NO PAYMENT FIELD EXISTS HERE OR COULD BE ADDED without
 * failing `.strict()` — a RATE is what a provider charges, not an instrument.
 */
const bodySchema = z
  .object({
    coverNote: z.string().max(4000).nullish(),
    /** ⚠ An ISO date string; `submitProposal` is what turns it into a `Date`. */
    validUntil: z.string().max(40).nullish(),
    rate: z
      .object({
        unitPriceCents: z.number().int().positive(),
        basis: z.enum(["RATE", "AMOUNT"]).optional(),
        uom: z.string().max(20).nullish(),
      })
      .strict()
      .nullish(),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await guardApi("canProvideServices");
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
      { error: "That proposal couldn't be read.", code: "BAD_BODY" },
      { status: 400 }
    );
  }

  try {
    /*
      ⚠⚠⚠ THE WORK REQUEST ID COMES FROM THE URL AND THE PROVIDER FROM THE
      SESSION. `submitProposal` resolves the person itself from `viewer.userId`,
      so no caller can propose AS somebody else (load-bearing rule 5).
    */
    const result = await submitProposal(gate, {
      workRequestId: id,
      coverNote: parsed.data.coverNote ?? null,
      validUntil: parsed.data.validUntil ?? null,
      rate: parsed.data.rate ?? null,
    });
    return NextResponse.json(result);
  } catch (e) {
    /*
      ⚠⚠ `SourcingError` CARRIES ITS OWN MESSAGE THROUGH, because every one of
      them is a sentence a provider needs to read — *"that invitation is
      closed"*, *"you haven't been invited"*. ⚠⚠⚠ Replacing them with
      "Forbidden" is the `TRANSACT_MESSAGE` lesson: a refusal that does not name
      its reason reads as a broken product.
      ⚠ The codes are `proposeEligibility`'s, which is also what the PAGE reads —
      one vocabulary, not two.
    */
    if (e instanceof Error && e.name === "SourcingError") {
      const code = (e as Error & { code?: string }).code ?? "INVALID";
      const status = code === "NOT_FOUND" ? 404 : code === "NOT_INVITED" ? 403 : 400;
      return NextResponse.json({ error: e.message, code }, { status });
    }
    console.error("[proposals] submit failed:", e);
    return NextResponse.json(
      { error: "Could not send that proposal." },
      { status: 500 }
    );
  }
}
