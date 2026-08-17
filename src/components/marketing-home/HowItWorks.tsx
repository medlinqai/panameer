import { Fragment } from "react";
import Link from "next/link";

/**
 * "HERE'S HOW IT WORKS" — the five cards, in the VideoSequence treatment.
 *
 * ── THIS IS THE SPINE, NOT A FEATURE STRIP ───────────────────────────────────
 *
 * Home has one job: the assessment. These five cards are the argument in
 * miniature, and each expands into its own section below (`#step-1` … `#step-5`).
 * It sits directly under the hero CTA on purpose — the CTA says "take the
 * assessment", so the next thing on the page is what happens when you do.
 *
 * ── THE TREATMENT IS PORTED FROM `marketing/VideoSequence`, NOT SHARED ───────
 *
 * That component is the Learn/Connect/Create/Settle strip on `/find-work`, and
 * it is Tailwind. This one stays in `home.css` where the rest of the home page
 * lives, and the VALUES are ported so the two strips read as one system:
 * gradient card, 180deg navy scrim, ghosted 58px numeral, 22px label, magenta
 * kicker, and the 34px magenta circles on the seams.
 *
 * ⚠ NO PHOTOGRAPHY AND NO VIDEO. VideoSequence's backgrounds are generated SVG
 * gradients with an optional clip on top; these are pure CSS gradients. Nothing
 * was added to `/public`, and there is no asset pipeline here to find.
 *
 * ⚠ NO PLAY CHIP. VideoSequence has one because it has video. These steps do
 * not, and an affordance that does nothing is worse than none.
 *
 * ── WHY EVERY CARD IS A PLAIN <a> AND NOTHING ELSE ───────────────────────────
 *
 * `check:ui` §12 asserts that no interactive element on `/` sits inside another
 * — the E097 regression, where a nested <button> broke hydration and ate the
 * Enter key. A card is ONE anchor with only text and spans inside it. Do not
 * put a second link, a button or an input in a card.
 */

type Step = {
  /** 1-based; also the anchor target and the ghosted numeral. */
  n: number;
  label: string;
  /**
   * ⚠ THERE IS NO KICKER ANY MORE. The card is numeral · title · one line, and
   * the magenta kicker slot ("10 minutes", "Automatically", …) is deleted
   * rather than emptied — the owner's copy replaced it with a fuller title and
   * a single supporting line, and a third text slot left in the markup would
   * just invite someone to refill it.
   */
  body: string;
  /**
   * Card 5 is the consultation, and it has to READ as optional before it is
   * read at all. It is the most persuasive element on the page — it removes the
   * fear of a sales call — so it must be legible as a CHOICE at a glance. In
   * the dark treatment that is a dashed outline over the band instead of a
   * gradient fill; see `.hiw-card.is-opt`.
   */
  optional?: boolean;
};

/**
 * ⚠ THE OWNER'S OWN COPY, VERBATIM.
 *
 * He drafted these five lines himself and asked for them as written; the only
 * edit made anywhere was a `COMPAIR` -> `Compare` typo fix. Titles stay in
 * TITLE CASE at 22px — do not switch them to uppercase, the uppercase labels
 * this replaced wrapped worse.
 *
 * Three things flagged in the report and deliberately NOT changed here:
 * the slash in "Score/Dashboard", "Detail processing" colliding with the word
 * "process" two cards earlier, and card 5 no longer containing the word
 * "free" anywhere. All three are his call, not mine.
 *
 * ── 2026-08-17: TWO TITLES SHORTENED ─────────────────────────────────────────
 *
 * E120 dropped "Level" from card 2, E121 dropped "Peers" from card 4, both
 * Scott's calls, for symmetry across the five. The reserved-row mechanism means
 * a shorter title CANNOT move the shared baselines — it only reduces the slack
 * under that card. Measured both ways at 1562 and 1200: 0px spread before and
 * after.
 *
 * ⚠ E121 SHORTENS THE STRING BUT DOES NOT RETIRE THE CLAIM. "vs Industry" still
 * implies a pooled benchmark and there is no pool — the same objection
 * `HANDOFF_2026-08-16.md` §6 files against "vs Industry Peers". It belongs on
 * the pre-launch copy-swap list either way; Scott chose to ship it.
 */
const STEPS: Step[] = [
  {
    n: 1,
    label: "Process-Specific Assessments",
    body: "Select the process you want to evaluate",
  },
  {
    n: 2,
    label: "Capability Domain Scoring",
    body: "Detail processing per capability domain",
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

/**
 * A BREAK OPPORTUNITY AFTER A SLASH — presentation, not a copy change.
 *
 * "AI Builds Your Score/Dashboard" contains a 15-character token with no break
 * opportunity in it, and at the 184px five-up card it measured wider than its
 * column: `scrollWidth > clientWidth`, i.e. the title spilling out of a card
 * that clips its own overflow. The owner asked for the copy as written, so the
 * text is untouched and the browser is given somewhere to break instead.
 *
 * `<wbr>` rather than `overflow-wrap` alone: left to break anywhere the word
 * splits as "Score/Dashboar|d". After the slash it splits as "Score/" +
 * "Dashboard", which is where a reader would break it too. Nothing is added to
 * the rendered text — copy, select and screen-reader output are unchanged.
 *
 * Generic rather than hard-coded to card 3, so a second slash in the owner's
 * copy cannot reintroduce the overflow.
 */
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

export function HowItWorks() {
  return (
    <section className="hiw">
      <div className="wrap">
        <div className="eyebrow">Here&rsquo;s How It Works</div>
        {/*
          ⚠ E124 — VERBATIM, AND THE PUNCTUATION IS DELIBERATE.

          Scott's string, 2026-08-17. The three-dot ellipsis with no space and
          the lower-case `with AI` tail are his; do not re-punctuate, re-case or
          title-case it. It reads oddly on purpose.

          ⚠ FLAGGED, NOT RESOLVED: this says "in an hour". The strip's banked
          times line says "eleven minutes to your dashboard". Both are true of
          different things — eleven minutes to the dashboard, about an hour once
          the optional 30-minute expert session is counted — but the page must
          not state two durations without distinguishing them. Scott decides.
        */}
        <h2 className="hiw-h2">
          From process questions to an AI roadmap in an hour...with AI
        </h2>
        {/*
          ⚠ E125 — A NEW ELEMENT, NOT THE KICKER COMING BACK.

          The magenta kicker slot was DELETED at 19050e5, not emptied. This is a
          description between the heading and the cards, and it is `.hiw-desc`
          rather than a revived `.hiw-k` precisely so nobody reads it as that
          slot returning.

          It must not shift the card grid: the reserved-row baselines inside the
          cards are measured from the grid top, so the gap this adds has to come
          out of `.hiw-strip`'s own top margin rather than being stacked on top
          of it. Measured before and after at all three widths.
        */}
        <p className="hiw-desc">
          Get the guidance you need to understand the AI options that will
          optimize your processing. Then meet with the world&rsquo;s top experts to
          prioritize solutions and create your own process-based AI Optimization
          Roadmap.
        </p>

        {/*
          ── THE STRIP WRAPS THE LIST BECAUSE THE RAIL IS NOT A LIST ITEM ──────

          `<ol>` may only contain `<li>`, so the rail and the four circles are
          siblings of the list inside a positioned wrapper rather than children
          of it. They are decoration: the ordered list already carries the
          sequence for anything that is not looking at the page.
        */}
        <div className="hiw-strip">
          {/*
            ⚠ THE RAIL IS THE POINT OF THIS REVISION.

            The arrows were never the problem — the absence of a line joining
            them was. Four circles in four gutters read as four loose dots; the
            same four circles on a rule read as stations on a route, which is
            what the section is describing. It runs centre-of-card-1 to
            centre-of-card-5 and sits BEHIND the cards, so it emerges from under
            one and disappears under the next.

            The last segment is DASHED, and that is the argument in one line:
            the sequence visibly becomes optional a card before the reader
            reaches the word.
          */}
          <span className="hiw-rail" aria-hidden />
          <span className="hiw-rail is-dashed" aria-hidden />

          <ol className="hiw-grid">
            {STEPS.map((s) => (
              <li className="hiw-cell" key={s.n}>
                <Link
                  href={`#step-${s.n}`}
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
              &rarr;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
