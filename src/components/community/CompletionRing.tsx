"use client";

import { type ProfileScore, type ScoreLine } from "@/lib/completeness";
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import "./profile-score.css";

export function CompletionRing({ score }: { score: ProfileScore }) {
  const { cycle, secondsLeft } = useRebuild();
  const R = 50;
  const C = 2 * Math.PI * R;
  const GAP = 0.8;

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
