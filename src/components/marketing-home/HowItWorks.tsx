import Link from "next/link";

/**
 * "HERE'S HOW IT WORKS" — the five cards (brief_home_assessment_spine §2).
 *
 * ── THIS IS THE SPINE, NOT A FEATURE STRIP ───────────────────────────────────
 *
 * Home stops being a marketplace brochure and becomes one page with one job:
 * the assessment. These five cards are the argument in miniature, and each one
 * expands into its own section below (`#step-1` … `#step-5`).
 *
 * ── WHY EVERY CARD IS A PLAIN <a> AND NOTHING ELSE ───────────────────────────
 *
 * `check:ui` §12 asserts that no interactive element on `/` sits inside
 * another — the E097 regression, where a nested <button> broke hydration and
 * ate the Enter key. So a card is ONE anchor with only text and spans inside
 * it. Do not put a second link, a button or an input in a card; put it in the
 * card's own section instead.
 *
 * ── THE CHEVRONS ARE DECORATION AND ARE MARKED AS SUCH ───────────────────────
 *
 * `▸` between cards 1–4 turns five tiles into one sequence — without it the eye
 * reads five unrelated things. They are `aria-hidden` and live outside the
 * anchors: a screen reader hearing "black right-pointing small triangle" four
 * times gets noise, and the ordered list already carries the sequence.
 *
 * The list is an <ol> for the same reason. The order IS the content.
 */

type Step = {
  /** 1-based; also the anchor target and the numeral shown. */
  n: number;
  label: string;
  sub: string;
  /**
   * Card 5 is the consultation, and it has to READ as optional before it is
   * read at all — see `.hiw-card.is-opt` in home.css. It is the most
   * persuasive element on the page precisely because it removes the fear of a
   * sales call, and a card that looks identical to the four mandatory ones
   * cannot do that job at a glance.
   */
  optional?: boolean;
};

/** ⚠ COPY IS EXACT, from the brief's table. Label caps come from CSS, not from
 *  shouting in the string — the sub-lines are sentence case and stay that way. */
const STEPS: Step[] = [
  {
    n: 1,
    label: "Take the assessment",
    sub: "Process-specific. Pick the process you care about.",
  },
  {
    n: 2,
    label: "AI scores every domain",
    sub: "Each capability domain inside that process, evaluated and scored.",
  },
  {
    n: 3,
    label: "We build your dashboard",
    sub: "Panameer creates your analytics dashboard and sends you the link.",
  },
  {
    n: 4,
    label: "You log in and review",
    sub: "Your scores and your opportunities, ranked.",
  },
  {
    n: 5,
    label: "Free consultation — optional",
    sub: "How to deploy each opportunity, and what the net effect on your business will be.",
    optional: true,
  },
];

export function HowItWorks() {
  return (
    <section className="hiw">
      <div className="wrap">
        <div className="eyebrow">Here&rsquo;s How It Works</div>

        <ol className="hiw-grid">
          {STEPS.map((s, i) => (
            <li className="hiw-cell" key={s.n}>
              <Link
                href={`#step-${s.n}`}
                className={"hiw-card" + (s.optional ? " is-opt" : "")}
              >
                {/*
                  THE TAG SITS ON THE TOP EDGE, inside the anchor, as a span.
                  It is part of the card's accessible name on purpose: "Optional
                  · 5 · Free consultation…" is exactly what a screen-reader user
                  needs to hear to make the same judgement a sighted user makes
                  from the dashed border.
                */}
                {s.optional && <span className="hiw-tag">Optional</span>}
                <span className="hiw-n">{s.n}</span>
                <span className="hiw-l">{s.label}</span>
                <span className="hiw-s">{s.sub}</span>
              </Link>
              {/* Cards 1–4 only: there is nothing after the last card. */}
              {i < STEPS.length - 1 && (
                <span className="hiw-chev" aria-hidden>
                  &#9656;
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
