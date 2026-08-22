import type { ReactNode } from "react";
import "@/components/marketing/step-disclosures.css";

/**
 * NUMBERED STEPS AS NATIVE DISCLOSURES — the shared shell (`P1-J0-E281`).
 *
 * Scott, 2026-08-21, with `/optimize` open beside `/learn`: *"Optimize looks
 * GREAT! ... this will be the model/template for all pages."*
 *
 * ⚠ ONE COMPONENT, TWO CALLERS — `OptimizeSteps` and `LearnPublic`. Learn
 * hand-rolling a second accordion would be `E242` and `E264` again: one
 * behaviour, two implementations, guaranteed to drift. This file exists to stop
 * that, so it takes the SHAPE and nothing else — no data, no strings, no
 * knowledge of what a step is about.
 *
 * ── ⚠ THE FOUR DECISIONS, CARRIED ACROSS FROM `OptimizeSteps` ────────────────
 *
 * 1. NATIVE `<details>` / `<summary>`, NOT AN ACCORDION. This is the whole reason
 *    a page built on it can stay a Server Component and prerender `○`. Native
 *    disclosure gives keyboard operation, correct screen-reader semantics and
 *    open-on-find-in-page for FREE, with no JavaScript. A hand-built accordion
 *    needs `"use client"`, its own `aria-expanded` and its own focus management,
 *    and it would spend the static render for nothing.
 *
 *    ⚠⚠ AND HERE IS THE PART THAT WAS BELIEVED AND IS MEASURABLY FALSE. Both this
 *    file's brief and `app/optimize/page.tsx` asserted that a `"use client"`
 *    directive here "takes `/optimize`'s static render with it". IT DOES NOT.
 *    Measured 2026-08-21 by adding the directive and running `npm run build`
 *    twice: `/optimize` printed `○` BOTH TIMES. `○` means prerendered at build
 *    time, and Next prerenders client components too — a route only leaves `○`
 *    when it reads REQUEST-TIME data (cookies, headers, `searchParams`, an
 *    uncached fetch), which nothing here does.
 *
 *    ⚠ WHAT THE DIRECTIVE ACTUALLY COSTS is the JS: this component and its whole
 *    subtree get shipped to the browser and hydrated, to re-implement behaviour
 *    `<details>` already performs with no script at all. That is reason enough
 *    not to add one — but it is a DIFFERENT reason, and the route table will not
 *    catch it for you. `check:ui` §31 therefore asserts the directive's ABSENCE
 *    from this file directly, because the route-mode proxy does not work.
 *
 * 2. NO `name=` ON THE `<details>`. A shared name makes them an EXCLUSIVE
 *    accordion: opening one closes the rest. A reader comparing two steps should
 *    not have to lose one to see the other, and "all open" is a state the
 *    measurements depend on being reachable.
 *
 * 3. THE `<summary>` IS THE CONTROL AND THE CHEVRON IS DECORATION. The chevron is
 *    `aria-hidden` and rotates via `details[open]` in CSS, so it needs no state.
 *    The summary already announces its own expanded state; a second announcement
 *    from an icon is noise.
 *
 * 4. NO INTERACTIVE DESCENDANT OF THE SUMMARY. A `<button>` inside a `<summary>`
 *    is `E097` wearing a different tag — the summary IS the interactive element,
 *    and a control inside it eats the Enter that opens the panel. `check:ui` §12
 *    already forbids it and audits every page these render on.
 *
 * ⚠ THE MARKUP IS TRANSCRIBED, NOT REWRITTEN. `/optimize` is a settled page and
 * its migration onto this component had to be provably invisible — measured at
 * 1440 / 900 / 390, before and after.
 */

export type Disclosure = {
  /** The drawn numeral. 1-based, and the caller owns the numbering. */
  n: number;
  /** The always-visible row label. */
  summary: string;
  /** What opens. Anything — a graphic, a heading and a graphic, or two of each. */
  panel: ReactNode;
};

export function StepDisclosures({ steps }: { steps: Disclosure[] }) {
  return (
    <section className="stepd-steps">
      <div className="stepd-wrap">
        {/*
          ⚠ AN ORDERED LIST, because the steps ARE a sequence and that is the one
          thing a closed disclosure cannot show. Anything not looking at the page
          gets the order from the markup rather than from the drawn numerals,
          which are `aria-hidden`.
        */}
        <ol className="stepd-list">
          {steps.map((s) => (
            <li className="stepd-item" key={s.n}>
              <details className="stepd-d">
                <summary className="stepd-sum">
                  <span className="stepd-n" aria-hidden>
                    {s.n}
                  </span>
                  <span className="stepd-t">{s.summary}</span>
                  <Chevron />
                </summary>
                <div className="stepd-panel">{s.panel}</div>
              </details>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * ⚠ DECORATION, AND `aria-hidden`. See decision 3 above. It rotates via
 * `details[open]` in CSS, so it needs no state and no client boundary.
 */
function Chevron() {
  return (
    <svg
      className="stepd-chev"
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
