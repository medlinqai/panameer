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
   * The short form of the step, in the magenta slot. It exists because the
   * numeral became a watermark: without it the card is a title and a paragraph
   * with a hole where the emphasis used to be.
   */
  kicker: string;
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
 * ⚠ COPY IS EXACT, from the brief's table.
 *
 * Labels are TITLE CASE at 22px. They were 13px uppercase with .09em tracking,
 * which wrapped as "TAKE THE / ASSESSMENT" in a fifth of the row.
 *
 * Card 5's label carries no "— OPTIONAL" any more: the chip says it, and saying
 * it twice on one card is how a design starts shouting.
 */
const STEPS: Step[] = [
  {
    n: 1,
    label: "Take the Assessment",
    kicker: "10 minutes",
    body: "Process-specific. Pick the process you care about.",
  },
  {
    n: 2,
    label: "AI Scores Every Domain",
    kicker: "Automatically",
    body: "Each capability domain inside that process, evaluated and scored.",
  },
  {
    n: 3,
    label: "We Build Your Dashboard",
    kicker: "Link by email",
    body: "Panameer creates your analytics dashboard and sends you the link.",
  },
  {
    n: 4,
    label: "You Log In and Review",
    kicker: "Ranked by opportunity",
    body: "Your scores and your opportunities, ranked.",
  },
  {
    n: 5,
    label: "Free Consultation",
    kicker: "Optional, always",
    body: "How to deploy each opportunity, and what the net effect on your business will be.",
    optional: true,
  },
];

export function HowItWorks() {
  return (
    <section className="hiw">
      <div className="wrap">
        <div className="eyebrow">Here&rsquo;s How It Works</div>
        <h2 className="hiw-h2">
          From one question to a costed plan, in five steps.
        </h2>

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
                    <span className="hiw-l">{s.label}</span>
                    <span className="hiw-k">{s.kicker}</span>
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
