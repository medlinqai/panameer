/**
 * ONE RING, THREE SIZES, AND A TRIPLE (brief_learn_app_shell WS1).
 *
 * `stroke-dasharray` on a rotated circle. Used at 74px (the dashboard level
 * badge), 132px (the path header arc) and 196px (the coverage chart) — and the
 * coverage chart is THIS COMPONENT COMPOSED THREE TIMES, not a fourth variant,
 * which is why `radius` and `bare` exist.
 *
 * ── WHY THE BRIEF'S FIVE PROPS AREN'T QUITE ENOUGH ───────────────────────────
 *
 * `{ value, max, size, label, sublabel }` is the whole API for the two single
 * rings. The triple needs two more things and neither is a variant:
 *
 *   `radius`  — three concentric rings are three DIFFERENT radii inside ONE
 *               196px box. Deriving it from `size` would force the caller to
 *               fake three different sizes and then position them, which is how
 *               you end up with a fourth component.
 *   `bare`    — the middle text belongs to the STACK, not to any one ring, so
 *               the outer two must be able to render no text at all.
 *
 * ── ⚠ max === 0 IS A REAL CASE, NOT A GUARD FOR TIDINESS ─────────────────────
 *
 * A brand-new learner has 0 certificates out of 0 attempted paths, and a path
 * with no lessons yet (three of them in the catalog have one) divides by its
 * own length. `0/0` renders an EMPTY ring, never a full one — a full ring on a
 * new account is the same class of lie as a hardcoded headline.
 */

export function ProgressRing({
  value,
  max,
  size,
  label,
  sublabel,
  radius,
  stroke,
  color = "var(--color-magenta)",
  trackColor = "rgba(255,255,255,0.18)",
  bare = false,
  gradient,
  className = "",
  labelClassName = "",
  sublabelClassName = "",
}: {
  value: number;
  max: number;
  /** Box size in px. The SVG is square and the ring is centred in it. */
  size: number;
  /** Big centre text. Usually a percentage or a level number. */
  label?: string;
  /** Small line under it. */
  sublabel?: string;
  /** Ring radius; defaults to the largest that fits the stroke. */
  radius?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  /** Render only the ring — the caller owns the centre text (the triple). */
  bare?: boolean;
  /** Two stops, painted as a linearGradient instead of a flat `color`. */
  gradient?: { id: string; from: string; to: string };
  className?: string;
  labelClassName?: string;
  sublabelClassName?: string;
}) {
  const w = stroke ?? Math.max(5, Math.round(size * 0.095));
  const r = radius ?? (size - w) / 2 - 1;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;

  /*
    ⚠ max <= 0 → 0, NOT 1. See the note at the top: `value/max` with max 0 is
    NaN, and a NaN dashoffset renders as a COMPLETE ring in every browser I
    checked — the exact wrong default for an empty account.
  */
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const dashoffset = circumference * (1 - frac);

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {gradient && (
          <defs>
            <linearGradient id={gradient.id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={gradient.from} />
              <stop offset="1" stopColor={gradient.to} />
            </linearGradient>
          </defs>
        )}
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={w} />
          {/*
            ⚠ NO `stroke-linecap:round` AT ZERO. A rounded cap on a zero-length
            dash paints a DOT — a new learner's empty ring would show a small
            magenta pip at 12 o'clock that reads as "1%". Butt caps below 2%.
          */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={gradient ? `url(#${gradient.id})` : color}
            strokeWidth={w}
            strokeLinecap={frac > 0.02 ? "round" : "butt"}
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </g>
      </svg>

      {!bare && (label || sublabel) && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-center leading-[1.15]">
          <span>
            {label && (
              <span className={`block font-display font-bold ${labelClassName}`}>{label}</span>
            )}
            {sublabel && <span className={`block ${sublabelClassName}`}>{sublabel}</span>}
          </span>
        </span>
      )}
    </span>
  );
}
