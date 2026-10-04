import { MATURITY_RUNGS, P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

const RUNG_SHORT = ["Manual", "Purpose-built", "Integrated ERP", "AI native"];

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
                  {}
                  <span className="lad-rail" aria-hidden />
                  <span
                    className={"lad-dot" + (on ? " is-on" : "")}
                    aria-hidden
                  />
                </div>
              );
            })}
            {}
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
