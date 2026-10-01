import { isCounted, type Figure } from "@/lib/figure";

/**
 * ── ⚠⚠⚠ THE GAUGE (`P2-A1.1-E730` WS-C) ────────────────────────────────────────────────
 *
 * ⚠ **SCOTT, 2026-09-30: *"a series of cards that look like pilot or car gauges"*** —
 * a semicircle, a magenta arc on a grey track, an ink needle.
 *
 * ── ⚠⚠⚠ ONE COMPONENT, EIGHT USES, AND NO DATA IN IT ───────────────────────────────────
 *
 * ⚠ **IT KNOWS NOTHING ABOUT AREAS, GOALS OR PRISMA.** It takes a figure and a scale and
 * draws a dial. ⚠⚠ Eight hand-drawn gauges would be `E585` eight times over, and the
 * failure mode is specific: the ARC MATHS would drift between copies and two cards showing
 * the same fraction would point their needles at different angles.
 *
 * ── ⚠⚠⚠ A FIGURE WITH NO SCALE DRAWS NO NEEDLE, AND THAT IS THE COUNTING RULE ──────────
 *
 * ⚠ **THREE STATES, NOT TWO** (counting rule 2 — *"a real zero and an uncountable figure
 * must not look the same"*, and *"the same rule applies to pictures"*):
 *   1. ⚠ **COUNTED, WITH A SCALE** — track, arc, ticks, needle, and `Goal: N`.
 *   2. ⚠⚠ **COUNTED, NO SCALE** — the figure is real but nobody has set a goal. The dial
 *      draws its track and ticks and **no arc and no needle**, because a needle with no
 *      scale is pointing at a number nobody chose. The figure still prints, in ink.
 *   3. ⚠⚠⚠ **UNCOUNTED** — the track is **hatched**, there is no needle, and **the reason
 *      prints**. ⚠ The hatch is the load-bearing cue and the dash is the second one, for
 *      the measured reason `honeycomb.css` records: a single cue fails for a colour-blind
 *      reader, at low contrast and in a screenshot.
 *
 * ⚠⚠ **A ZERO IS NEVER SOFTENED INTO A DASH.** A measured `0` takes state 1 and its needle
 * sits hard left, which is a result. Only `{ uncounted }` reaches state 3.
 *
 * ── ⚠⚠ EVERY COLOUR IS A TOKEN ──────────────────────────────────────────────────────────
 *
 * ⚠ `--color-magenta`, `--color-ink`, `--color-line`, `--color-bg-soft` — all exist, none
 * carries a `var()` fallback. ⚠⚠⚠ **A FALLBACK HIDES A DEAD VARIABLE** (Scott, 2026-09-22):
 * `var(--nope, #fff)` paints white forever and a gate can still see the name.
 * ⚠⚠ **AND THAT IS WHAT MAKES DARK MODE FREE** — the tokens flip, so there is no second
 * dark rule here and no hard-coded `#fff` to break it (`E723`'s lesson).
 */

/** ⚠ Geometry, in the SVG's own units. A 180×100 box holds a radius-70 semicircle. */
const R = 70;
const CX = 90;
const CY = 86;

/** ⚠ `0` is hard left, `1` is hard right. The arc sweeps over π radians. */
function pointAt(fraction: number): [number, number] {
  const a = Math.PI * (1 - fraction);
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)];
}

function arcPath(from: number, to: number): string {
  const [x0, y0] = pointAt(from);
  const [x1, y1] = pointAt(to);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

export function formatFigure(n: number, money?: boolean): string {
  return money ? `$${n.toLocaleString("en-US")}` : n.toLocaleString("en-US");
}

export function Gauge({
  figure,
  goal,
  money,
  label,
}: {
  figure: Figure;
  /** ⚠⚠ `null` MEANS THERE IS NO HONEST SCALE — not a scale of zero. */
  goal: number | null;
  money?: boolean;
  /** ⚠ For the accessible name. The dial is a picture; the words carry the meaning. */
  label: string;
}) {
  const counted = isCounted(figure);
  /*
    ⚠⚠⚠ A NEEDLE IS DRAWN ONLY WHEN BOTH HALVES ARE REAL. ⚠ `goal > 0` as well as
    non-null: a scale of zero would make every fraction `Infinity` and park every needle
    hard right, which reads as "complete" on a card that has measured nothing.
  */
  const scaled = counted && goal != null && goal > 0;
  const fraction = scaled ? Math.min(figure / goal, 1) : 0;

  /* ⚠ Ten ticks, every fifth one longer — the mockup's dial face. */
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const f = i / 10;
    const [x0, y0] = pointAt(f);
    const inner = R - (i % 5 ? 8 : 13);
    const a = Math.PI * (1 - f);
    return {
      x1: x0,
      y1: y0,
      x2: CX + inner * Math.cos(a),
      y2: CY - inner * Math.sin(a),
      major: i % 5 === 0,
    };
  });

  const [nx, ny] = (() => {
    const a = Math.PI * (1 - fraction);
    const len = R - 20;
    return [CX + len * Math.cos(a), CY - len * Math.sin(a)];
  })();

  const name = counted
    ? goal != null
      ? `${label}: ${formatFigure(figure, money)} of ${formatFigure(goal, money)}`
      : `${label}: ${formatFigure(figure, money)}, no goal set`
    : `${label}: not counted — ${figure.uncounted}`;

  return (
    <svg viewBox="0 0 180 100" role="img" aria-label={name} className="pm-gauge-dial">
      {/*
        ⚠⚠ THE HATCH IS AN SVG `<pattern>`, NOT A CSS GRADIENT. ⚠⚠⚠ A `repeating-linear-
        gradient` CANNOT BE A `stroke`, and the track here IS a stroke — so the hatch the
        honeycomb gets from CSS has to be a paint server in SVG. ⚠ Same cue, same meaning,
        different mechanism, and the mechanism is forced by the shape rather than chosen.
        ⚠ The id is per-label so two gauges on one page cannot collide on it.
      */}
      {!counted && (
        <defs>
          <pattern
            id={`pm-gauge-hatch-${label.replace(/\W+/g, "")}`}
            width="6"
            height="6"
            patternTransform="rotate(-45)"
            patternUnits="userSpaceOnUse"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-line)" strokeWidth="2" />
          </pattern>
        </defs>
      )}

      <path
        d={arcPath(0, 1)}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        stroke={
          counted
            ? "var(--color-line)"
            : `url(#pm-gauge-hatch-${label.replace(/\W+/g, "")})`
        }
      />

      {/* ⚠ The filled arc exists only when there is a scale to fill. */}
      {scaled && fraction > 0 && (
        <path
          d={arcPath(0, fraction)}
          fill="none"
          stroke="var(--color-magenta)"
          strokeWidth="10"
          strokeLinecap="round"
        />
      )}

      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="var(--color-line)"
          strokeWidth={t.major ? 1.5 : 1}
        />
      ))}

      {/* ⚠⚠ NO NEEDLE AND NO HUB WITHOUT A SCALE. ⚠ The hub alone would read as a needle
          pointing straight at `0`, which is a measurement this card has not made. */}
      {scaled && (
        <>
          <line
            x1={CX}
            y1={CY}
            x2={nx.toFixed(1)}
            y2={ny.toFixed(1)}
            stroke="var(--color-ink)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r="5" fill="var(--color-ink)" />
        </>
      )}
    </svg>
  );
}
