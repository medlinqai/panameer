import { MATURITY_RUNGS, P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

/**
 * STEP 2 GRAPHIC — the maturity ladder, run down every capability domain.
 *
 * The brief's stated job: "Demystifies what 'AI scores it' means." So the
 * picture is the mechanism, not a brain icon — every domain is a row, every
 * rung is a column, and the answer is a dot that lands on one of them. Read
 * across: that domain's level. Read down: the shape of the whole process.
 *
 * ── ⚠ FOUR RUNGS, NOT FIVE — A DELIBERATE DEPARTURE FROM THE BRIEF ───────────
 *
 * §3 of the brief says "Five rungs". The shipped assessment has FOUR:
 * `MATURITY_RUNGS = [10, 23, 37, 50]`, restructured 2026-08-15 (`c76e7d6`) and
 * mapped so `((avg-10)/40)*100` did not move. The older five-rung ladder in
 * `assessment_engine_spec.md` predates that change.
 *
 * A graphic whose entire purpose is to explain the real scoring cannot show a
 * ladder the real questionnaire does not offer — a visitor would count four
 * options on `/assess` and five here. So the rungs are READ FROM THE BANK and
 * the count follows the product automatically. If the ladder ever goes back to
 * five, this picture changes with it and no one has to remember. Reported
 * rather than done quietly.
 *
 * Inert by construction: no links, buttons, inputs or handlers.
 */

/** Short column heads. The bank's own titles are 3–7 words — accurate, and far
 *  too long for four columns above eight rows. Paired by INDEX to
 *  `MATURITY_RUNGS`, so a reordered ladder cannot silently mislabel itself. */
const RUNG_SHORT = ["Manual", "Purpose-built", "Integrated ERP", "AI native"];

/**
 * One answer per domain, as rung INDEX. A plausible mid-maturity organisation:
 * strong where software is bought off the shelf, weak where the work is still
 * somebody's spreadsheet, nothing at AI-native yet — which is the read that
 * makes the rest of the page's argument.
 *
 * Illustrative, like every other figure in `DashboardShot`. Not wired to data,
 * and it must not be mistaken for an average of real submissions.
 */
const ANSWERS = [1, 0, 1, 2, 1, 2, 0, 1];

export function LadderShot() {
  return (
    <div className="lad">
      <div className="lad-grid">
        {/* Header row: an empty corner, then the rungs. */}
        <div className="lad-corner">Capability domain</div>
        {MATURITY_RUNGS.map((_, i) => (
          <div className="lad-head" key={RUNG_SHORT[i]}>
            {RUNG_SHORT[i]}
          </div>
        ))}

        {P2P_DOMAINS.map((d, row) => (
          <div className="lad-row" key={d.key}>
            <div className="lad-name">{d.name}</div>
            {MATURITY_RUNGS.map((_, col) => {
              const on = ANSWERS[row] === col;
              return (
                <div className="lad-cell" key={col}>
                  {/* The rail is drawn on every cell so the ladder reads as a
                      continuous track rather than as eight loose dots. */}
                  <span className="lad-rail" aria-hidden />
                  <span
                    className={"lad-dot" + (on ? " is-on" : "")}
                    aria-hidden
                  />
                </div>
              );
            })}
            {/*
              THE SCORE IS DERIVED FROM THE SAME TABLE THE DOT IS.
              Two renderings of one number that could disagree is the exact
              defect `DashboardShot`'s FINDINGS comment exists to prevent.
            */}
            <div className="lad-score">{MATURITY_RUNGS[ANSWERS[row]]}</div>
          </div>
        ))}
      </div>
      <p className="lad-foot">
        Every capability domain in the process, scored on the same ladder &mdash; so
        the gaps are comparable to each other, not just to a benchmark.
      </p>
    </div>
  );
}
