import { lineCounts, type ProfileScore, type ScoreLine } from "@/lib/completeness";
import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";

/**
 * ── ⚠⚠⚠ THE OUTSTANDING LINES, IN ONE PLACE (`P2-A2-E720` item 2) ─────────────────────
 *
 * ⚠ **SCOTT: *"/profile 'N items left' must read the Score page's own list
 * (`ConnectProfile.tsx:341` `openLines` is a second definition, `E585`)."***
 *
 * ⚠⚠ **MEASURED BEFORE ANYTHING WAS MOVED, AND THE HONEST ANSWER IS THAT THE THREE COPIES
 * AGREED.** On two personas, the Score page and the profile card returned the SAME figures —
 * Scott Walls **2 open / 4 minutes**, Priya Nair **7 open / 16 minutes** — because all three
 * derivations were the same two lines of code written out three times.
 * ⚠⚠⚠ **SO THIS IS NOT A REPAIR OF A WRONG NUMBER; IT IS THE REMOVAL OF THE THING THAT LETS
 * ONE APPEAR.** Reporting it as a fixed mismatch would have been a lie in the direction of
 * looking useful, and `E585`'s whole point is that identical copies agree right up until one
 * of them is edited.
 *
 * ── ⚠⚠ THE THREE THAT WERE COLLAPSED ────────────────────────────────────────
 *
 * ⚠ `ProfileScoreView.tsx` (the Score page's `open`) · `ConnectProfile.tsx` (the profile
 * card's `openLines`) · `completion-hook.ts` (`completionHook`'s `open`).
 * ⚠⚠ **THE MINUTES WERE A FOURTH AND A FIFTH COPY OF A SECOND RULE** — each of the three
 * summed `SCORE_LINE_COPY[...].minutes` itself, and one of them guarded the lookup with `??
 * 0` while the others did not. **That difference is exactly the drift this file exists to
 * stop:** a key missing from the copy table would have been a silent `0` on one surface and a
 * crash on another.
 * ⚠ **MEASURED: 0 open keys are missing from `SCORE_LINE_COPY` on either persona**, so the
 * guard is kept here once and is correct rather than defensive-in-one-place-only.
 */

/**
 * Every line still outstanding, biggest points first.
 *
 * ⚠⚠ `lineCounts` IS THE RULE AND IT IS NOT RE-STATED HERE: a line answered *"I have none"*
 * COUNTS and is not outstanding (`E590`). ⚠ Sorted because the step worth the most points is
 * the one worth doing first, and both surfaces number their list in that order.
 */
export function openScoreLines(score: Pick<ProfileScore, "lines"> | null | undefined): ScoreLine[] {
  return (score?.lines ?? [])
    .filter((l) => !lineCounts(l.state))
    .sort((a, b) => b.points - a.points);
}

/**
 * The estimated minutes across a set of outstanding lines.
 *
 * ⚠⚠ **IT TAKES THE LINES, NOT THE SCORE, SO A CALLER CANNOT SUM A DIFFERENT SET THAN IT
 * COUNTED.** The profile says *"N items left · about M mins"*, and N and M have to describe
 * the same N — summing only the two lines a card happens to show would understate the work
 * while naming the full count, which is a figure disagreeing with its own label.
 * ⚠ `?? 0` because a line whose key has no copy row contributes no estimate; that is reported
 * by `openLinesMissingCopy` rather than hidden.
 */
export function openScoreMinutes(lines: ScoreLine[]): number {
  return lines.reduce((sum, l) => sum + (SCORE_LINE_COPY[l.key]?.minutes ?? 0), 0);
}

/**
 * ⚠ The outstanding lines that have no `SCORE_LINE_COPY` row.
 *
 * ⚠⚠ **A GATE NEEDS THIS TO BE ABLE TO FAIL.** `openScoreMinutes` deliberately tolerates a
 * missing key so a surface never crashes on one; that tolerance is also how a missing key
 * becomes an invisible under-count. This is how the check sees what the page forgives.
 */
export function openLinesMissingCopy(lines: ScoreLine[]): ScoreLine[] {
  return lines.filter((l) => !SCORE_LINE_COPY[l.key]);
}
