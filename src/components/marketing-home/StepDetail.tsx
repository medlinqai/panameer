import type { ReactNode } from "react";

/**
 * ONE SECTION PER CARD (brief_home_assessment_spine §3).
 *
 * The shell only. Each of the five graphics lives in `marketing-home/steps/`
 * and is passed in, because the graphics have nothing in common with each other
 * — a question card, a score matrix, an email, a dashboard and a booking slip —
 * and a component that tried to abstract all five would be a switch statement
 * wearing a costume.
 *
 * ── THE NUMERAL IS THE LINK BACK ─────────────────────────────────────────────
 *
 * Each section carries its step numeral, large and magenta, beside the title —
 * the same numeral in the same colour as the card that linked here. That
 * repetition is the whole navigation: a visitor who clicks card 4 has to land
 * somewhere that obviously IS card 4, and an anchor that drops you at an
 * unlabelled heading leaves you checking whether the jump worked.
 *
 * `scroll-margin-top` on the section (home.css) keeps the heading clear of the
 * sticky header — without it the anchor lands with the title under the nav.
 *
 * ── ALTERNATION, NOT DECORATION ──────────────────────────────────────────────
 *
 * Five long sections in a row read as one undifferentiated slab. `shade`
 * alternates them on the same `--paper-2` the page already uses for `.fw` and
 * `.erp` (E115's rhythm rule) rather than introducing a sixth background value.
 */
export function StepDetail({
  n,
  title,
  lead,
  shade = false,
  wide = false,
  children,
}: {
  n: number;
  title: string;
  lead: ReactNode;
  /** Every other section takes the shaded ground. */
  shade?: boolean;
  /**
   * Step 4 only. The brief gives the product shot the most room of the five, so
   * its graphic breaks out of the 1200px measure the prose keeps.
   */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={`step-${n}`}
      className={"sd" + (shade ? " sd-shade" : "") + (wide ? " sd-wide" : "")}
    >
      <div className="wrap">
        <div className="sd-head">
          <span className="sd-n" aria-hidden>
            {n}
          </span>
          <div className="sd-headtext">
            {/*
              ⚠ THE NUMERAL IS `aria-hidden` AND REPEATED HERE INSTEAD.
              Rendered as a bare "4" beside the title it would be read as part
              of the heading ("4 You log in and review"), which is how the
              number ends up in the document outline and in a screen reader's
              heading list. The visible glyph is decoration; the accessible
              heading says "Step 4 — You log in and review".
            */}
            <h2>
              <span className="sr-step">Step {n} &mdash; </span>
              {title}
            </h2>
            <p className="sd-lead">{lead}</p>
          </div>
        </div>
        <div className="sd-art">{children}</div>
      </div>
    </section>
  );
}
