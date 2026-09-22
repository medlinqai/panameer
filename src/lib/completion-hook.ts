import { lineCounts, type ProfileScore } from "@/lib/completeness";
import { SCORE_LINE_COPY } from "@/lib/profile-score-copy";

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
