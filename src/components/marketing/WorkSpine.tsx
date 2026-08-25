import type { ReactNode } from "react";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { WorkRequestDraftShot } from "@/components/marketing/work-shots";
import { WORK_STEPS, WORK_SPINE_HEADING } from "@/lib/work-steps";

/**
 * `/find-work`'s FIVE-STEP SPINE (`P1-J4-E006`).
 *
 * ⚠ THE SAME `StepDisclosures` SHELL AS `/optimize`, `/learn` AND `/hire-talent`
 * (`5d50135`). Native `<details>`, no client boundary, `E097` holds. A fourth
 * hand-rolled accordion is what `E242`/`E264`/`E281` all exist to prevent — one
 * behaviour, one implementation, four callers.
 *
 * ⚠ THE PANELS ARE FILLED NOW (`P1-J4-E014`/`E015`). Scott, seeing an open step 1
 * with an eyebrow and nothing else: *"you did not create suggested graphics and text
 * for each step."* Every description is CC's DRAFT, marked as such at its site in
 * `lib/work-steps.ts` and reported verbatim so he can overwrite them in one message.
 *
 * ⚠ ONLY STEP 1 HAS A GRAPHIC, and the other four absences are deliberate — see
 * `work-shots.tsx`. A drawn screen for a model that does not exist is a claim
 * stronger than the sentence above it.
 *
 * ⚠⚠ ONE OF FIVE STEPS IS BUILT. See `WORK_BUILD_STATE`'s note in
 * `lib/work-steps.ts` — step 1 is a real wizard writing real rows; steps 2-5 have no
 * model at all, and `WorkRequest.status` never advances past `POSTED`. Steps 2-5 are
 * on the pre-launch list as a BLOCK.
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home`, so the eyebrow is Tailwind mirroring
 * `/optimize`'s computed values — 19px / 700 / #d72cd6 / ls 2.66px / uppercase /
 * lh 28.5px. Sixth instance of that scoping trap; measured, not assumed.
 */
/**
 * ⚠ THE GRAPHIC PER STEP. Only step 1 has one, and the four absences are the
 * ANSWER rather than a gap — see `work-shots.tsx` for the honesty test that
 * decided it. Steps 2-5 have no models at all; a drawn screen would be a claim
 * stronger than the sentence above it.
 */
const GRAPHICS: Record<number, ReactNode> = {
  1: <WorkRequestDraftShot />,
  /* 2-5 — none. No Proposal/Offer, WorkOrder, SettlementRequest, Invoice or Payment
     model exists. Do not fill these until they do. */
};

export function WorkSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
            {WORK_SPINE_HEADING}
          </p>
          {/*
            ⚠ NO TAGLINE UNDER THE EYEBROW. `/optimize` and `/learn` both promote a
            sentence into a display headline here; Scott has not written one for Work.
            Drafting it would put CC's words in the largest text on the page.

            ⚠ `pb-[80px]` MATCHES `/optimize`'s 81px tagline-to-row-1 gap, the value
            measured for `P1-J0-E319` — so the fourth spine does not repeat the
            spacing divergence `/learn` had.
          */}
        </div>
      </section>
      <StepDisclosures
        steps={WORK_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            <>
              {/* ⚠ DERIVED, NEVER TYPED — `Step N - <label>` from `WORK_STEPS`. */}
              <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
                {`Step ${step.n} - ${step.summary}`}
              </p>
              {/* ⚠ `.stepd-h2` — the SHARED rule, so the four spines cannot drift
                  apart on panel type. */}
              <h2 className="stepd-h2">{step.description}</h2>
              {GRAPHICS[step.n]}
            </>
          ),
        }))}
      />
    </>
  );
}
