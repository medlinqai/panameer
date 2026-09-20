/**
 * ── ⚠⚠ THE PROFILE COMPLETION RING (`P2-J3-E588` WS-A) ─────────────────────
 *
 * ⚠⚠⚠ THE RING IS INK. `E433` — MAGENTA MARKS INTERACTIVE THINGS, and a ring is
 * a figure nobody clicks. ⚠ **There is no blue in the brand**, so the mockup's
 * dark stroke is ink, not a navy. The three buttons beneath it are magenta;
 * they are the interactive things on that rail.
 * ⚠ This is the same ruling that put `E562`'s meter figure and progress bar in
 * ink — the third surface to take it, deliberately.
 *
 * ── ⚠⚠ ONE PERCENTAGE ON THE PAGE, AND IT IS `completeness` ────────────────
 *
 * ⚠⚠ THE SAME FIELD AND THE SAME LABEL BASIS AS `ProviderProfileView.tsx:345`.
 * **No second number is computed here** — this component is handed the figure
 * and draws it. ⚠ `completeness.ts` IS UNTOUCHED by this brief; what it would
 * take for the ring to mean *"complete"* rather than *"the required set"* is in
 * the WS-A report, and is `E582`.
 *
 * ⚠ THE LABEL UNDER THE FIGURE SAYS WHAT THE FIGURE MEASURES, for the same
 * reason `E562` stopped saying `Complete`: the number is right and the word
 * would be the thing that misleads.
 */
export function CompletionRing({ percent }: { percent: number }) {
  /* ⚠ CLAMPED FOR THE DRAWING ONLY. `completeness` is capped at 100 upstream,
     but a ring is geometry and a value outside 0–100 would draw a wrong arc
     rather than an obviously wrong number. The printed figure is untouched. */
  const drawn = Math.max(0, Math.min(100, percent));
  const R = 50;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const offset = CIRCUMFERENCE * (1 - drawn / 100);

  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="font-display text-[15px] font-bold">Profile Completion</h2>

      <div className="relative my-2 h-[118px] w-[118px]">
        <svg
          width="118"
          height="118"
          viewBox="0 0 118 118"
          className="-rotate-90"
          role="img"
          /* ⚠ THE FIGURE IS IN THE ACCESSIBLE NAME, not only in the painted
             text — a screen reader must not have to infer it from an arc. */
          aria-label={`${percent}% of required details`}
        >
          <circle
            cx="59"
            cy="59"
            r={R}
            fill="none"
            className="stroke-line"
            strokeWidth="11"
          />
          <circle
            cx="59"
            cy="59"
            r={R}
            fill="none"
            className="stroke-ink"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-[22px] font-bold text-ink">
          {percent}%
        </span>
      </div>

      {/* ⚠ NAMES THE DENOMINATOR, byte-consistent with the meter on the profile
          strip. The two surfaces must not disagree about what is measured. */}
      <p className="text-[12px] text-ink-2">of required details</p>
    </div>
  );
}
