"use client";

import { type ProfileScore, type ScoreLine } from "@/lib/completeness";
/* ⚠⚠ THE SHARED REBUILD (`P2-A2-E600` WS-D). ⚠ ADDING IT MADE THIS A CLIENT
   COMPONENT — it was a server one, and the hook needs a browser. ⚠⚠⚠ THAT IS A
   REAL COST AND IT IS ACCEPTED: the ring is a small leaf with no data access of
   its own, so the boundary moves by a few hundred bytes and `p` never crosses
   it (`ConnectProfile` still passes only the computed `score`). */
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import "./profile-score.css";

/**
 * ── ⚠⚠ THE PROFILE COMPLETION RING (`P2-J3-E590` WS-C) ────────────────────
 *
 * ⚠ Scott, 2026-09-20: *"the circle is perfect for the profile completion...
 * The image is the thing that will show on the main profile...the baiot to have
 * the user click it."*
 *
 * ── ⚠⚠⚠ IT TAKES THE BREAKDOWN NOW, NOT A BARE PERCENT ────────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the whole previous signature and
 * the ruling that shaped it:
 * //   export function CompletionRing({ percent }: { percent: number }) { … }
 * //   ⚠⚠⚠ THE RING IS INK. `E433` — MAGENTA MARKS INTERACTIVE THINGS, and a
 * //   ring is a figure nobody clicks.
 *
 * ⚠⚠ THE PREMISE OF THAT RULING NO LONGER HOLDS, WHICH IS WHY THE COLOUR MOVES
 * AND `E433` DOES NOT. The ring is now the CLICK TARGET on this card and every
 * slice is a hover target on `/community/score`. `E433` reserves magenta for
 * interactive things; this ring became one. ⚠ Confirmed by Scott 2026-09-20:
 * *"good on the ring color."*
 * ⚠ **THE FIGURE IN THE CENTRE STAYS INK.** It is still a number, and `E433`
 * still governs numbers.
 *
 * ⚠⚠ A BARE PERCENT COULD NOT DRAW THIS. One arc per line sized by its weight,
 * with `declared_none` painted as a third state, needs the per-line breakdown —
 * which is why `computeProfileScore` returns both the total and the lines.
 */
export function CompletionRing({ score }: { score: ProfileScore }) {
  /* ⚠⚠ THE SHARED REBUILD — a `cycle` and a countdown, nothing else. `score` is
     untouched: only the drawing moves (WS-D rule 3). */
  const { cycle, secondsLeft } = useRebuild();
  const R = 50;
  const C = 2 * Math.PI * R;
  /* ⚠ A SMALLER GAP THAN THE SCORE PAGE'S. This ring is 118px across, not 340 —
     the page's 1.5 units would eat a three-point slice at this radius. */
  const GAP = 0.8;

  /* ⚠⚠ `reduce`, NOT A MUTABLE CURSOR ACROSS A `map`. Lint flags a variable
     reassigned after render completes, because React may re-enter the render
     and the offsets would silently drift. Measured on the score page. */
  const segments = score.lines.reduce<
    { line: ScoreLine; len: number; offset: number }[]
  >((acc, l) => {
    const used = acc.reduce((a, s) => a + (s.line.points / 100) * C, 0);
    acc.push({ line: l, len: (l.points / 100) * C - GAP, offset: -used });
    return acc;
  }, []);

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
             text — a screen reader must not infer it from an arc. */
          aria-label={`${score.total} of 100`}
        >
          <circle cx="59" cy="59" r={R} fill="none" className="stroke-line-2" strokeWidth="11" />
          {/* ⚠ Re-keyed on `cycle` so the CSS replays — same mechanism as the
              Score ring, same stylesheet, no second animation path. */}
          <g key={cycle} className="pm-rebuild-draw">
          {segments.map((s) => (
            <circle
              key={s.line.key}
              cx="59"
              cy="59"
              r={R}
              fill="none"
              strokeWidth="11"
              strokeLinecap="butt"
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={s.offset}
              className={paintClass(s.line.state)}
            />
          ))}
          </g>
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-[22px] font-bold text-ink">
          {score.total}
        </span>
      </div>

      <p className="text-[12px] text-ink-2">of 100</p>
      {/* ⚠ The same caption as the Score page's ring, from the same component —
          one wording, three pictures. */}
      <RebuildBadge secondsLeft={secondsLeft} />
    </div>
  );
}

/* ⚠⚠⚠ `completionHook` MOVED TO `lib/completion-hook.ts` (`P2-A2-E600` WS-D).
   ⚠ ADDING `"use client"` TO THIS FILE MADE IT A CLIENT FUNCTION, and
   `ConnectProfile` — a SERVER component — calls it. The page 500ed with
   *"Attempted to call completionHook() from the server but completionHook is on
   the client."*
   ⚠⚠ `npm run build` AND `tsc` BOTH PASSED. Only rendering caught it — the same
   class as `E597` WS-C's `SectionSpec` across the boundary, and the second time
   this session that a boundary error was invisible to both.
   ⚠ SUPERSEDED, quoted not deleted (`E164`): the function lived here, directly
   below the component that shares its stylesheet. */

function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}
