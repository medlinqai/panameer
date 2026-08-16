import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";
import { stepsFor } from "@/lib/assessment/steps";

/**
 * STEP 1 GRAPHIC — one question on screen, and that is the whole argument.
 *
 * The brief states this image's job precisely: "to prove it is short." So it
 * shows a single question filling a screen, four choices, and a progress
 * counter — not a form, not a montage, not a stack of steps.
 *
 * ── IT IS DRAWN FROM THE REAL QUESTION BANK ──────────────────────────────────
 *
 * The domain title, the question and the four rung labels are read from
 * `questions-p2p.ts`, the same source `/assess` renders. A hand-typed copy
 * would be a marketing page quietly disagreeing with the product the moment
 * someone edits a rung — and the rung titles HAVE changed twice already.
 *
 * ⚠ INERT BY CONSTRUCTION. No links, no buttons, no inputs, no handlers — the
 * same rule `DashboardShot` follows. A visitor must not be able to click
 * something that pretends to work, and `check:ui` §12 would fail on a control
 * nested in a card besides.
 */

/* Contract Management — the third domain, so the "3 of" counter is honest
   about WHICH question is on screen rather than showing question 3 with
   domain 1's text. */
const DOMAIN = P2P_DOMAINS[2];

/**
 * ⚠ THE TOTAL IS DERIVED, NEVER TYPED.
 *
 * This shipped as a literal "3 of 12" and was wrong by one: the wizard walks
 * THIRTEEN steps logged out and twelve signed in, and a visitor reading a
 * marketing page is by definition logged out. `stepsFor(null)` is the same
 * function `/assess` walks, so the picture and the product cannot disagree —
 * and adding a ninth capability domain moves this number by itself, the way
 * `MATURITY_RUNGS` already moves the ladder in `LadderShot`.
 *
 * `at` stays a literal because it is a composition choice, not a fact: the
 * screenshot shows someone part-way in, and DOMAIN below is the third domain so
 * the counter and the question on screen agree with each other.
 */
const COUNTER = { at: 3, of: stepsFor(null).length };

export function QuestionShot() {
  return (
    <div className="qs">
      <div className="qs-bar">
        <span className="qs-count">
          {COUNTER.at} of {COUNTER.of}
        </span>
        <span className="qs-track">
          <span
            className="qs-fill"
            style={{ width: `${(COUNTER.at / COUNTER.of) * 100}%` }}
          />
        </span>
      </div>

      <div className="qs-eyebrow">Capability Domain</div>
      <div className="qs-title">{DOMAIN.name}</div>
      <p className="qs-q">{DOMAIN.question}</p>

      <div className="qs-opts">
        {DOMAIN.rungs.map((r, i) => (
          <div
            key={r.title}
            /* The second rung shown as chosen: a screenshot with nothing
               selected reads as an unanswered form rather than as a person
               part-way through. */
            className={"qs-opt" + (i === 1 ? " is-on" : "")}
          >
            <span className="qs-dot" aria-hidden />
            <span className="qs-opt-t">{r.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
