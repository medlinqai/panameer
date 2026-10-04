import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";
import { stepsFor } from "@/lib/assessment/steps";

const DOMAIN = P2P_DOMAINS[2];

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
