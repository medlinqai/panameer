import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

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
 * ⚠ "3 of 12" IS THE BRIEF'S STRING AND IT IS NOT WHAT A VISITOR TO THIS PAGE
 * WILL SEE.
 *
 * The wizard walks THIRTEEN steps logged out and twelve signed in
 * (`stepsFor()` in AssessmentWizard — a signed-in visitor is not asked for an
 * email). Someone reading a marketing page is logged out, so their counter will
 * read "3 / 13". Shipped as briefed rather than silently corrected to 13;
 * flagged in the report as Scott's call.
 */
const COUNTER = { at: 3, of: 12 };

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
