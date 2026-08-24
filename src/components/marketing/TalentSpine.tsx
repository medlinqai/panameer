import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { TALENT_STEPS, TALENT_SPINE_HEADING } from "@/lib/talent-steps";

/**
 * `/hire-talent`'s FIVE-STEP SPINE (`P1-J1-E012`).
 *
 * ⚠ THE SAME `StepDisclosures` SHELL AS `/optimize` AND `/learn` (`5d50135`).
 * Native `<details>`, no client boundary, `E097` holds. A third hand-rolled
 * accordion is what `E242`/`E264`/`E281` all exist to prevent — one behaviour,
 * one implementation, three callers.
 *
 * ── ⚠⚠ THE PANELS ARE DELIBERATELY EMPTY, AND THAT IS THE INSTRUCTION ───────
 *
 * Scott has given the five LABELS and nothing else. Panel descriptions and
 * graphics are `brief_talent_spine_panels_2026-08-24.md`, a separate brief that
 * has not fired. ⚠ NOTHING IN A PANEL MAY BE INVENTED HERE.
 *
 * ⚠ SO EACH PANEL RENDERS ITS DERIVED EYEBROW AND NOTHING ELSE. That is not
 * invented copy — `Step N - <label>` is computed from the label he gave, exactly
 * as `/optimize` and `/learn` do it (`P1-J0-E305`). The alternative was a
 * disclosure that opens onto literally nothing, which reads as broken rather than
 * as unfinished.
 *
 * ⚠⚠ IT IS VISIBLY INCOMPLETE ON PURPOSE. A row that opens to one line of eyebrow
 * announces that the content is coming; a row that opens to a plausible
 * chat-written paragraph would look finished and be wrong. Do not "improve" these
 * panels — fill them from the panels brief when Scott writes it.
 *
 * ── ⚠ TWO OF FIVE STEPS ARE REAL. See `lib/talent-steps.ts` ─────────────────
 *
 * Step 3 (`Connect with Experts`) has NO `Connection` model at all, and step 5
 * (`Sell Direct to Oracle Licensees`) has only the seller half — no buyer can
 * browse or offer, and there is no `Offer` model. ⚠ BOTH ARE FLAGGED FOR THE
 * PRE-LAUNCH LIST. Shipped because outstanding parts gate promotion, not the build.
 *
 * ⚠ THIS PAGE IS NOT INSIDE `.pm-home`, so the heading is Tailwind mirroring
 * `/optimize`'s computed eyebrow values — 19px / 700 / #d72cd6 / ls 2.66px /
 * uppercase / lh 28.5px. Fifth instance of that scoping trap; measured, not
 * assumed.
 */
export function TalentSpine() {
  return (
    <>
      <section className="border-t border-line bg-white pt-14 min-[900px]:pt-[72px]">
        <div className="mx-auto max-w-[1200px] px-8">
          <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
            {TALENT_SPINE_HEADING}
          </p>
          {/*
            ⚠ NO TAGLINE UNDER THE EYEBROW. `/optimize` and `/learn` both promote a
            sentence into a display headline here; Scott has not written one for
            Talent. ⚠ DRAFTING ONE WOULD PUT CHAT'S WORDS IN THE LARGEST TEXT ON
            THE PAGE. Reported and left out.
          */}
        </div>
      </section>
      <StepDisclosures
        steps={TALENT_STEPS.map((step) => ({
          n: step.n,
          summary: step.summary,
          panel: (
            /*
              ⚠ THE DERIVED EYEBROW ONLY — see the file header. `Step N - <label>`
              is computed from `TALENT_STEPS`, so a hand-typed eyebrow fails
              `check:ui`. Nothing else goes in here until the panels brief fires.
            */
            <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-[#d72cd6]">
              {`Step ${step.n} - ${step.summary}`}
            </p>
          ),
        }))}
      />
    </>
  );
}
