/* ⚠ `summaryFor` LIVES BESIDE THE DATA, not here — so `check:ui` can assert the
   rendered summaries against their source without importing React. */
import { SPINE_STEPS, summaryFor } from "@/lib/spine-steps";
import { StepGraphic } from "@/components/marketing-home/SpineSteps";
import { ProcessPicker } from "@/components/marketing-home/ProcessPicker";

/**
 * THE FIVE STEPS, AS DISCLOSURES — `/optimize` (P1-J0-E259).
 *
 * Closed, each step is a number and a short title. Open, it is exactly what `/`
 * shows today: the step's own heading and its own graphic, unaltered.
 *
 * ── ⚠ NATIVE `<details>` / `<summary>`. NOT AN ACCORDION ─────────────────────
 *
 * This is the whole reason `/optimize` can stay a Server Component and prerender
 * `○`. Native disclosure gives keyboard operation, correct screen-reader
 * semantics and open-on-find-in-page for FREE, with no JavaScript. A hand-built
 * accordion needs `"use client"`, its own `aria-expanded`, its own focus
 * management, and it would spend the static render for nothing.
 *
 * ⚠ IF A `"use client"` DIRECTIVE EVER APPEARS IN THIS FILE, THE APPROACH WAS
 * ABANDONED. There is nothing here that needs one.
 *
 * ⚠ THE `<summary>` IS THE CONTROL AND THE CHEVRON IS DECORATION. There is no
 * `<button>` inside the summary — that is `E097` again, and `check:ui` §12
 * already forbids an interactive descendant of an interactive element. The
 * browser's default marker is stripped in CSS and the chevron is drawn, because
 * the two fight otherwise.
 *
 * ── ⚠ EVERY STRING IS DERIVED. NOT ONE IS RETYPED ────────────────────────────
 *
 * `SPINE_STEPS` already holds the eyebrow, the title and the `graphic` key for
 * steps 2–5, and `StepGraphic` already resolves the key. Retyping any of it here
 * would let this page drift from `/` the first time Scott changes a string —
 * which is the same rule that made `E155` correct, and the same defect
 * `P1-J0-E242` records when one journey is told from two arrays.
 */

/**
 * ⚠ STEP 1 IS NOT IN `SPINE_STEPS` AND IS NOT BEING ADDED TO IT.
 *
 * It is `ProcessPicker`, which carries the four process cards and has a
 * different shape — the exception `spine-steps.ts` records at the top of its own
 * file, and the same one `E164` hit. It is handled as ONE conditional here.
 * Folding it into the data to make this loop tidy would change what `/` renders.
 */
const STEP_ONE = { n: 1, summary: "Select a Business Process" } as const;

/**
 * ⚠ NO `name=` ON THE `<details>`, AND THAT IS A DECISION.
 *
 * A shared `name` turns them into an EXCLUSIVE accordion: opening one closes the
 * rest. The brief asks for five disclosures, not one-at-a-time, and exclusivity
 * would make "all five open" a state the browser refuses to produce — which is
 * the state this page's height had to be measured in. A reader comparing step 2's
 * wizard with step 4's dashboard should not have to lose one to see the other.
 */
export function OptimizeSteps() {
  return (
    <section className="opt-steps">
      <div className="wrap">
        <ol className="opt-list">
          {/*
            ⚠ AN ORDERED LIST, because the five steps ARE a sequence and that is
            the one thing a closed disclosure cannot show. Anything not looking
            at the page gets the order from the markup rather than from the
            drawn numerals, which are `aria-hidden`.
          */}
          <li className="opt-item">
            <details className="opt-d">
              <summary className="opt-sum">
                <span className="opt-n" aria-hidden>
                  {STEP_ONE.n}
                </span>
                <span className="opt-t">{STEP_ONE.summary}</span>
                <Chevron />
              </summary>
              <div className="opt-panel">
                <ProcessPicker />
              </div>
            </details>
          </li>

          {SPINE_STEPS.map((s) => (
            <li className="opt-item" key={s.n}>
              <details className="opt-d">
                <summary className="opt-sum">
                  <span className="opt-n" aria-hidden>
                    {s.n}
                  </span>
                  <span className="opt-t">{summaryFor(s.eyebrow)}</span>
                  <Chevron />
                </summary>
                <div className="opt-panel">
                  {/*
                    ⚠ THE STEP'S OWN HEADING AND ITS OWN GRAPHIC, UNALTERED.
                    Nine briefs between E145 and E251 live inside those four
                    components. They move as they are — a wrapper change is not
                    a licence to touch their contents.
                  */}
                  <h2 className="opt-h2">{s.title}</h2>
                  <StepGraphic graphic={s.graphic} />
                </div>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * ⚠ DECORATION, AND `aria-hidden`. The `<summary>` already announces its own
 * expanded state; a second announcement from an icon is noise. It rotates via
 * `details[open]` in CSS, so it needs no state and no client boundary.
 */
function Chevron() {
  return (
    <svg
      className="opt-chev"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
