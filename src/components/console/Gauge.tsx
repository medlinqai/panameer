import { isCounted, type Figure } from "@/lib/figure";

const R = 70;
const CX = 90;
const CY = 86;

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
