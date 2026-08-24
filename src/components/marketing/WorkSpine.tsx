import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { WORK_STEPS, WORK_SPINE_HEADING } from "@/lib/work-steps";

/**
 * `/find-work`'s FIVE-STEP SPINE (`P1-J4-E006`).
 *
 * ⚠ THE SAME `StepDisclosures` SHELL AS `/optimize`, `/learn` AND `/hire-talent`
 * (`5d50135`). Native `<details>`, no client boundary, `E097` holds. A fourth
 * hand-rolled accordion is what `E242`/`E264`/`E281` all exist to prevent — one
 * behaviour, one implementation, four callers.
 *
 * ⚠⚠ THE PANELS ARE EMPTY BY INSTRUCTION. Scott has given the five LABELS and
 * nothing else; panel copy is a separate brief, the same split as
 * `brief_talent_walk1` / `brief_talent_spine_panels`. ⚠ NOTHING HERE MAY BE INVENTED.
 *
 * ⚠ EACH PANEL RENDERS ITS DERIVED EYEBROW AND NOTHING ELSE — `Step N - <label>`,
 * computed from `WORK_STEPS`, exactly as the other three pages do (`P1-J0-E305`).
 * That is not invented copy, and it beats a disclosure that opens onto literally
 * nothing, which reads as broken rather than unfinished.
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
export function WorkSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pb-[80px] pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
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
            <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
              {`Step ${step.n} - ${step.summary}`}
            </p>
          ),
        }))}
      />
    </>
  );
}
