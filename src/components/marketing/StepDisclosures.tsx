import type { ReactNode } from "react";
import "@/components/marketing/step-disclosures.css";

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
        {}
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
