/* ⚠ `summaryFor` LIVES BESIDE THE DATA, not here — so `check:ui` can assert the
   rendered summaries against their source without importing React. */
import { SPINE_STEPS, summaryFor } from "@/lib/spine-steps";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { StepGraphic } from "@/components/marketing-home/SpineSteps";
import { ProcessPicker } from "@/components/marketing-home/ProcessPicker";

/**
 * `/optimize`'s FIVE STEPS — the DATA and the PANELS. The shell is shared.
 *
 * Closed, each step is a number and a short title. Open, it is exactly what `/`
 * shows today: the step's own heading and its own graphic, unaltered.
 *
 * ── ⚠ THIS FILE NO LONGER OWNS THE DISCLOSURE (`P1-J0-E281`) ────────────────
 *
 * `StepDisclosures` does, and the four decisions that used to be documented here
 * moved there with the markup — native `<details>` with no client boundary, no
 * `name=` (not an exclusive accordion), the `<summary>` is the control and the
 * chevron is decoration, and no interactive descendant of the summary (`E097`).
 *
 * ⚠ READ THAT FILE BEFORE CHANGING THE SHAPE OF A ROW. This one is a CALLER, and
 * a stale copy of those notes here would be worse than none. `/learn` is the other
 * caller; a change to the shell reaches both pages at once.
 *
 * ⚠ THE MIGRATION HAD TO BE INVISIBLE. `/optimize` is a settled page, so the five
 * summary rows and an open panel were measured at 1440 / 900 / 390 before and
 * after, and `check:ui`'s derived-summary assertions had to pass UNEDITED — if any
 * of them had needed a change, the render would have moved.
 *
 * ── ⚠ EVERY STRING IS STILL DERIVED. NOT ONE IS RETYPED ─────────────────────
 *
 * `SPINE_STEPS` holds the eyebrow, the title and the `graphic` key for steps 2–5,
 * and `StepGraphic` resolves the key against the same registry `/` renders from,
 * so the art cannot drift between the two pages.
 */

/**
 * ⚠ STEP 1 IS NOT IN `SPINE_STEPS` AND IS NOT BEING ADDED TO IT.
 *
 * It is `ProcessPicker`, which carries the four process cards and has a different
 * shape — the exception `spine-steps.ts` records at the top of its own file, and
 * the same one `E164` hit. It is handled as ONE entry here. Folding it into the
 * data to make this tidy would change what `/` renders.
 */
const STEP_ONE = { n: 1, summary: "Select a Business Process" } as const;

export function OptimizeSteps() {
  return (
    <StepDisclosures
      steps={[
        { n: STEP_ONE.n, summary: STEP_ONE.summary, panel: <ProcessPicker /> },
        ...SPINE_STEPS.map((s) => ({
          n: s.n,
          summary: summaryFor(s.eyebrow),
          panel: (
            <>
              {/*
                ⚠ THE STEP'S OWN HEADING AND ITS OWN GRAPHIC, UNALTERED. Nine
                briefs between E145 and E251 live inside those four components.
                They move as they are — a wrapper change is not a licence to touch
                their contents.
              */}
              <h2 className="stepd-h2">{s.title}</h2>
              <StepGraphic graphic={s.graphic} />
            </>
          ),
        })),
      ]}
    />
  );
}
