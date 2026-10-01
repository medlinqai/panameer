import Link from "next/link";
import { isCounted } from "@/lib/figure";
import { Gauge, formatFigure } from "@/components/console/Gauge";
import { levelFor, USAGE_LEVEL_LABEL, type UsageArea, type UsageSub } from "@/lib/usage-areas";
import "@/components/console/gauges.css";

/**
 * ── ⚠⚠⚠ THE GAUGE GRID (`P2-A1.1-E730` WS-C) ───────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"gauges by PROFILE, LEARN, CONNECT, HIRE, SHOP, ORDERS and PAY"*, plus
 * Account Health so the grid is 4 + 4 with no empty slot.** Four across at desktop, two at
 * phone.
 *
 * ⚠⚠ **IT RENDERS WHAT IT IS GIVEN AND COUNTS NOTHING.** Every figure, goal, label, link
 * and hover line arrives on `UsageArea[]` from `lib/usage-areas.ts`, which is the same array
 * the honeycomb in the header draws. ⚠⚠⚠ **THAT IS WHY A CELL AND ITS GAUGE CANNOT DISAGREE
 * ABOUT THE SAME MEMBER IN THE SAME RENDER** — not because they are kept in step, but
 * because there is only one of them.
 *
 * ── ⚠⚠ THE SECTION IS `Your Activity`, AND IT IS NOT CALLED A JOURNEY ──────────────────
 *
 * ⚠ **SCOTT: *"users will not know what a journey is."*** The heading is `Your Activity`
 * and each card's eyebrow is the **menu label** of the area it links to, read from the nav
 * rather than retyped (`E585`).
 */
export function UsageGauges({ areas }: { areas: UsageArea[] }) {
  return (
    <section className="mt-10">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-bold">Your Activity</h2>
        {/* ⚠⚠ NO WINDOW IS CLAIMED. The mockup's note said *"This month"*; these figures
            are `"all"` (`E603` correction 4 — the front face shows figures as they stand),
            so a *"this month"* caption would have been a false statement about every number
            under it. ⚠ A control says what it governs at the point it governs it, and the
            honest version of that here is to claim no window at all. */}
        <small className="text-[12px] text-ink-3">Hover a gauge for detail</small>
      </div>

      <div className="pm-gauges">
        {areas.map((a) => (
          <Card key={a.key} area={a} />
        ))}
      </div>
    </section>
  );
}

function Sub({ sub }: { sub: UsageSub }) {
  /* ⚠⚠ A `const` ALIAS, NOT `sub.figure` DIRECTLY. ⚠⚠⚠ TypeScript narrows a union through a
     const alias and a const boolean; it CANNOT narrow a PROPERTY ACCESS through a separate
     boolean, because the property could in principle change between the two reads. ⚠ The
     Honeycomb does exactly this, and for the same reason — a cast would silence the one
     check this type exists to make. */
  const fig = sub.figure;
  const counted = isCounted(fig);
  return (
    <div className="pm-gauge-sub">
      <span>{sub.label}</span>
      {/*
        ⚠⚠ `<strong>`, NOT `<b>`. ⚠⚠⚠ MEASURED: the sub-figures were INVISIBLE to anything
        walking the DOM for numbers — `check:stats-live`'s sweep reads
        `p, span, strong, div, td`, and `<b>` is in none of those. ⚠ So two of every card's
        three figures could not be checked by any live gate, and `Invites Sent` could not
        be found at all. ⚠ `<strong>` is also the honest tag: these carry IMPORTANCE, not
        a typographic flourish.
      */}
      {counted ? (
        <strong>{fig.toLocaleString("en-US")}</strong>
      ) : (
        /* ⚠⚠⚠ THE BADGE CARRIES THE WORDS, AND THE REASON IS ON THE TITLE. ⚠ A bare `—`
            beside a label is the thing counting rule 2 forbids: a reader cannot tell
            "nothing here" from "we cannot count this". */
        <strong>
          <span className="pm-gauge-nc" title={fig.uncounted}>
            NOT COUNTED
          </span>
        </strong>
      )}
    </div>
  );
}

function Card({ area: a }: { area: UsageArea }) {
  /* ⚠ Same const-alias narrowing as `Sub` above. */
  const fig = a.figure;
  const counted = isCounted(fig);
  /* ⚠⚠ THE SAME FUNCTION THE COMB CALLS (`E585`). ⚠⚠⚠ A hexagon tinted from one rule and a
     word printed from another would disagree on one screen — the cell saying `Strong` by
     colour while the card beside it said `Medium` in words. */
  const level = levelFor(fig, a.goal);

  return (
    <div
      className="pm-gauge"
      data-gauge={a.key}
      data-counted={counted ? "yes" : "no"}
    >
      {/*
        ⚠⚠ `<p>`, NOT `<div>`, AND THAT IS NOT COSMETIC. ⚠⚠⚠ A card's eyebrow and label are
        the only TEXT that says what its numbers mean, and as anonymous `<div>`s nothing
        walking the DOM could find them — `check:stats-live`'s label resolution looks at
        `p, span, strong, dt, h2, h3`, so every figure on this card inherited the wrong
        label (measured: the Earnings card's figures were labelled *"Not counted yet"*,
        which is the REASON text, because that was the first `<span>` in the card).
        ⚠ A screen reader walking the same tree has the same problem.
      */}
      <p className="pm-gauge-eyebrow" data-gauge-eyebrow>
        {a.eyebrow}
      </p>
      <p className="pm-gauge-label">{a.label}</p>

      <Gauge figure={fig} goal={a.goal} money={a.money} label={a.label} />

      {/*
        ⚠⚠⚠ `Goal: N` IN PLACE OF A BARE MAXIMUM (Scott's decision 3). ⚠ An unlabelled
        number under the right-hand end of a dial implies somebody decided what "full"
        means; the word `Goal` says who is claiming it.
        ⚠⚠ AND IT IS ABSENT WHEN THERE IS NO SCALE, rather than printing `Goal: 0` —
        see `Gauge.tsx`'s three states.
      */}
      {/*
        ⚠⚠⚠ THE BARE `0` AT THE LEFT END IS GONE. ⚠ The mockup printed `0` and the raw
        maximum as axis ends; once the right end became `Goal: N` (Scott's decision 3) the
        lone `0` labelled nothing — the dial's own left stop already shows where zero is.
        ⚠⚠ IT WAS ALSO ACTIVELY HARMFUL: a scale endpoint is not a FIGURE, but it reads as
        one to anything sweeping the page for numbers, so on the Earnings card the axis `0`
        and the value `—` appeared as one label rendering as both a number and a dash —
        exactly the state `check:stats-live` §1 forbids. ⚠⚠⚠ **THE GATE WAS RIGHT AND THE
        CARD WAS WRONG.**
      */}
      <div className="pm-gauge-scale">
        {a.goal != null ? (
          <span data-goal>
            Goal: {formatFigure(a.goal, a.money)}
            {/* ⚠ SCOTT: *"each gauge card shows the level as a word beside `Goal: N`."*
                ⚠⚠ ABSENT WHEN THERE IS NO LEVEL — an uncounted figure gets no word, the
                same way it gets no needle and no tint. */}
            {level && (
              <span className="pm-gauge-level" data-level={level}>
                {USAGE_LEVEL_LABEL[level]}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}
      </div>

      {/*
        ⚠⚠⚠ THE VALUE ELEMENT HOLDS **ONLY** THE FIGURE, AND THE REASON IS ITS SIBLING.
        ⚠ They were nested, and `check:stats-live` §1 went red: its sweep walks up four
        parents to find a figure's LABEL, so *"Not counted yet"* became the label of the
        dash AND of the sub-figures beside it — one label reading as both a number and a
        dash, which is precisely the state that gate exists to forbid.
        ⚠⚠ **THE MARKUP WAS THE DEFECT, NOT THE GATE.** A figure and its explanation are
        two things and nesting them made the page unreadable to anything walking the DOM —
        including, in principle, a screen reader announcing the value.
      */}
      <div className="pm-gauge-value">
        {counted ? (
          formatFigure(fig, a.money)
        ) : (
          <span aria-hidden>&mdash;</span>
        )}
      </div>
      {!counted && (
        <>
            {/*
              ⚠⚠⚠ THE REASON, ALONE — NO `Not counted —` PREFIX. ⚠ It printed
              **"Not counted — Not counted yet"** on the Earnings card, because
              `statistics.ts` already phrases that reason as a full sentence
              ("Not counted yet"). ⚠⚠ FOUND BY `check:stats-live` §1, whose rule is
              that no figure renders as both a number and a dash — it reads the
              page's text and the doubled phrase tripped it.
              ⚠ **THE DASH ABOVE ALREADY SAYS "not counted"; this says WHY.**
            */}
          <span className="pm-gauge-why">{fig.uncounted}</span>
        </>
      )}

      <div className="pm-gauge-subs">
        <Sub sub={a.subs[0]} />
        <Sub sub={a.subs[1]} />
      </div>

      <Link className="pm-gauge-go" href={a.href}>
        Go to {a.go} &rarr;
      </Link>

      {/* ⚠ The hover line. ⚠⚠ IT IS A `title` RATHER THAN A STYLED TOOLTIP so it reaches
          a keyboard and a screen reader without this card owning a popover. */}
      <div className="pm-gauge-tip" title={a.tip}>
        {a.tip}
      </div>
    </div>
  );
}
