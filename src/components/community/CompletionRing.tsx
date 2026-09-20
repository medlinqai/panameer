import { lineCounts, type ProfileScore, type ScoreLine } from "@/lib/completeness";
import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";
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
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-[22px] font-bold text-ink">
          {score.total}
        </span>
      </div>

      <p className="text-[12px] text-ink-2">of 100</p>
    </div>
  );
}

/**
 * ── ⚠⚠ THE HOOK, COMPUTED — NEVER HARD-CODED (`E590` WS-C item 3) ─────────
 *
 * ⚠⚠⚠ AT 100% IT SAYS SOMETHING ELSE AND DOES NOT PRINT *"0 lines left"*. A
 * to-do count of zero is not an encouragement, it is a sentence that reads as
 * broken — and it is the same class of defect as a `0` on an untracked stat
 * tile: a number nobody meant.
 *
 * ⚠ The minutes come from `SCORE_LINE_COPY`, which labels them an ESTIMATE, and
 * the copy always says *"about"*.
 */
export function completionHook(score: ProfileScore): string {
  const open = score.lines.filter((l) => !lineCounts(l.state));
  if (open.length === 0) {
    /* ⚠ NOT "Complete" — `E562` retired the word and `E590` did not bring it
       back. This states what was done, not a verdict on the person. */
    return "Every line answered. Nothing left to do here.";
  }
  const minutes = open.reduce((a, l) => a + SCORE_LINE_COPY[l.key].minutes, 0);
  return `${open.length} line${open.length === 1 ? "" : "s"} left. About ${minutes} minute${
    minutes === 1 ? "" : "s"
  } to 100%.`;
}

function paintClass(state: ScoreLine["state"]): string {
  if (state === "filled") return "pm-score-filled";
  if (state === "declared_none") return "pm-score-declared";
  return "pm-score-empty";
}
