/* ⚠ THE SUMMARIES LIVE BESIDE THE DATA, not here — so `check:ui` can assert the
   rendered rows against their source without importing React. `summaryFor()` is
   gone; see the `summary` field's note in `spine-steps.ts` for why. */
import { SPINE_STEPS } from "@/lib/spine-steps";
import { StepDisclosures } from "@/components/marketing/StepDisclosures";
import { StepGraphic } from "@/components/marketing-home/SpineSteps";

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

/*
  ── ⚠⚠ THERE IS NO `STEP_ONE` CONST ANY MORE (`P1-J0-E288`) ───────────────────

  This file used to hold `const STEP_ONE = { n: 1, summary: "Select a Business
  Process" }` and render it as a separate entry above a `.map` over `SPINE_STEPS`,
  because step 1's art was `ProcessPicker` and nothing else's was a component the
  registry knew.

  Scott, 2026-08-24: *"all steps after the first are effectively 'grouped'. I
  thought that should be corrected and consistent."* Step 1 is in `SPINE_STEPS`
  now, its `graphic` is the registry key `process-picker`, and this component is
  ONE `.map` over five with no special case left.

  ⚠ `ProcessPicker` IS NO LONGER IMPORTED HERE — `StepGraphic` resolves it, the
  same way it resolves the other four. That is the whole point: one mechanism.
*/
export function OptimizeSteps() {
  return (
    <StepDisclosures
      steps={SPINE_STEPS.map((s) => ({
        n: s.n,
        /* ⚠ THE SHORT HANDLE. Not derived — see `spine-steps.ts`. */
        summary: s.summary,
        panel: (
          <>
            {/*
              ── ⚠⚠ THE FULL EYEBROW, AND IT IS AN `E275` REQUIREMENT ──────────

              `P1-J0-E286` shortened the row to 3-4 words. The eyebrow used to be
              the row, and the panel never rendered it — so shortening the row
              alone would have DELETED the full string from the page, inverting
              `P1-J0-E275` six days after it landed.

              ⚠ WHAT E275 FIXED, AND WHAT WOULD HAVE COME BACK: the eyebrow
              carries the EXPANSION (`Panameer's AI Platform (AIP)`) and the
              sentence beneath uses the short form (`the AIP`). With the row cut to
              `Submit to the AIP`, the acronym would be INTRODUCED in a label and
              expanded NOWHERE — the exact backwards state `E232` left and `E275`
              corrected.

              ⚠ SAME FOR STEP 2. `Provide Capability Domain (Transaction-Level)
              Details` is Scott's verbatim string and `(Transaction-Level)` is the
              part that does the work. It cannot survive in four words.

              ⚠ SO THE FULL STRING KEEPS ITS JOB AND THE SHORT ONE BECOMES THE
              HANDLE. `check:ui` asserts both expansions are still in the DOM.
            */}
            <p className="mb-3 font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
              {s.eyebrow}
            </p>
            {/*
              ⚠ THE STEP'S OWN HEADING AND ITS OWN GRAPHIC, UNALTERED. Nine briefs
              between E145 and E251 live inside those four components. They move as
              they are — a wrapper change is not a licence to touch their contents.

              ⚠ STEP 1 RENDERS NO `<h2>`: `ProcessPicker` carries its own heading,
              and printing the title above it would be two headings for one step.
            */}
            {s.n > 1 && <h2 className="stepd-h2">{s.title}</h2>}
            <StepGraphic graphic={s.graphic} />
          </>
        ),
      }))}
    />
  );
}
