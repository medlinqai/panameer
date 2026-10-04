import { Fragment } from "react";
import Link from "next/link";

type Step = {
  /** 1-based; also the anchor target and the ghosted numeral. */
  n: number;
  label: string;
  body: string;
  optional?: boolean;
};

const STEPS: Step[] = [
  {
    n: 1,
    label: "Process-Specific Assessments",
    body: "Select the process you want to evaluate",
  },
  {
    n: 2,
    label: "Capability Domain Scoring",
    body: "Provide transaction-level details",
  },
  {
    n: 3,
    label: "AI Builds Your Score/Dashboard",
    body: "Score each domain & suggest solutions",
  },
  {
    n: 4,
    label: "Review & Compare vs Industry",
    body: "See ranking and review solutions",
  },
  {
    n: 5,
    label: "Discuss Solutions With an Expert",
    body: "Select & prioritize based on requirements",
    optional: true,
  },
];

function breakAtSlash(label: string) {
  const parts = label.split("/");
  if (parts.length === 1) return label;
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <wbr />}
      {part}
      {i < parts.length - 1 ? "/" : null}
    </Fragment>
  ));
}

export function HowItWorks({
  showStrip = true,
}: {
  showStrip?: boolean;
} = {}) {
  return (
    <section className="hiw">
      <div className="wrap">
        <div className="eyebrow">Here&rsquo;s How It Works</div>
        {}
        {}
        <h2 className="hiw-h2">
          From process questions to a finished AI Roadmap in under an hour of
          your time.
        </h2>

        {}

        {showStrip && (
          <>
          {}
          <div className="hiw-strip">
            {}
            <span className="hiw-rail" aria-hidden />
            <span className="hiw-rail is-dashed" aria-hidden />

            <ol className="hiw-grid">
              {STEPS.map((s) => (
                <li className="hiw-cell" key={s.n}>
                  <Link
                    href={s.n === 1 ? "#step-process" : `#spine-step-${s.n}`}
                    className={
                      "hiw-card" + (s.optional ? " is-opt" : ` is-g${s.n}`)
                    }
                  >
                    {/*
                      THE SCRIM, over the gradient and under the words — the same
                      180deg navy ramp VideoSequence uses. It is what lets 13px
                      body copy sit on a saturated fill without hand-tuning a text
                      colour per card.
                    */}
                    <span className="hiw-scrim" aria-hidden />
                    <span className="hiw-n" aria-hidden>
                      {s.n}
                    </span>
                    {/*
                      Top-RIGHT, where VideoSequence puts its play chip — the one
                      corner in this design system that carries a card-level flag.
                      Inside the anchor and NOT aria-hidden, so its accessible
                      name opens with "Optional".
                    */}
                    {s.optional && <span className="hiw-tag">Optional</span>}

                    <span className="hiw-text">
                      <span className="hiw-l">{breakAtSlash(s.label)}</span>
                      <span className="hiw-s">{s.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            {/*
              Four circles on the four seams. `--k` is the seam index; the exact
              offset is computed in home.css from the grid gap, because "20%" is
              not the seam centre once a gap exists.
            */}
            {[1, 2, 3, 4].map((k) => (
              <span
                className="hiw-arrow"
                style={{ "--k": k } as React.CSSProperties}
                key={k}
                aria-hidden
              >
                {/*
                  ⚠ AN OPEN CHEVRON, NOT A FILLED DISC (E122 revised).

                  Scott: "These arrows are childish. Can you make them bigger?
                  Better?" It was a 42px saturated magenta circle with a drop
                  shadow, five of them across the row — which read as five
                  identical buttons and broke the standing PINK = SMALL ACCENTS
                  ONLY rule (decisions-01.md, 2026-08-13).

                  An open stroke can grow without gaining weight, which is the
                  whole trick: this is TALLER than the disc it replaces and
                  narrower, so it reads bigger while taking less of the gutter and
                  giving the rail more room to show. Magenta is the STROKE now;
                  there is no fill and no shadow.

                  Drawn as SVG rather than a text glyph so stroke weight and cap
                  shape are controllable rather than whatever the font ships.
                  No `id` anywhere — nothing for check:ui §13 to collide with.
                */}
                <svg
                  viewBox="0 0 14 28"
                  fill="none"
                  aria-hidden
                  focusable="false"
                >
                  <path
                    d="M3.5 3.5 L11 14 L3.5 24.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ))}
          </div>
          </>
        )}
      </div>
    </section>
  );
}
