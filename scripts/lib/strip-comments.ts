/**
 * ── ⚠⚠ ONE COMMENT STRIPPER, BECAUSE THE FIFTH MISCOUNT WAS A HAND-ROLLED ONE
 *
 * ⚠⚠⚠ SCOTT, 2026-09-20: *"that's the fifth miscount of this shape and the
 * stripper is the fix."*
 *
 * ── WHAT KEEPS GOING WRONG ─────────────────────────────────────────────────
 *
 * `E164` says superseded code is QUOTED, never deleted. ⚠⚠ SO THIS REPO IS FULL
 * OF CODE THAT LOOKS LIVE AND IS NOT, AND EVERY MEASUREMENT OVER SOURCE TEXT
 * THAT FORGETS THAT COMES BACK WRONG. Five times, all the same shape:
 *
 *   1. *"5 callers"* → 2        — three hits were inside comments
 *   2. *"19 files"*  → 20 raw / 16 live
 *   3. *"106"*       → 100      — grep matched the `E164` quote of an old table
 *   4. `nav.ts:547`  → not live — a tab inside a superseded quoted block
 *   5. ⚠⚠ `AttentionStrip.tsx:224` → not live — inside a **JSX** comment
 *
 * ⚠⚠⚠ MEASURED 2026-09-20, AND IT MATTERS FOR SCOPE: **all thirteen `check:*`
 * gate strippers already handle the JSX form correctly.** Every one of them is
 * regex-based on the block form, and `{​/* … *​/}` CONTAINS a block comment — so
 * stripping the block leaves only the braces. ⚠ **The gates were never wrong.**
 * ⚠⚠ WHAT WAS WRONG WAS A THROWAWAY, LINE-BASED SCRIPT written for a one-off
 * inventory, which tested `line.startsWith("/*")` and so walked straight past
 * `{​/*`. ⚠ **That is the fix this module is: somewhere to import from, so the
 * next inventory does not hand-roll a fourteenth.**
 *
 * ⚠ THE THIRTEEN ARE DELIBERATELY NOT REFACTORED TO USE THIS. They are correct,
 * they are each asserted by their own gate, and churning thirteen working gates
 * is risk without benefit — the same reasoning that kept `E591`'s five
 * user-facing `/profile` links where they were.
 *
 * ── ⚠ WHAT IT IS NOT ───────────────────────────────────────────────────────
 *
 * ⚠⚠ IT IS NOT A PARSER, AND IT MUST NOT GROW INTO ONE. It does not know about
 * strings, so a comment delimiter inside a string literal is removed too. ⚠ For
 * the job it has — *"is this grep hit live code?"* — that is the safe direction
 * to be wrong in: it UNDERCOUNTS live code rather than overcounting it, and an
 * undercount is a question, while an overcount is a false report.
 * ⚠ `//` preceded by `:` is spared, so `https://…` in live code survives.
 */

/**
 * Remove JSX, block and line comments from TypeScript / TSX source.
 *
 * ⚠⚠ THE JSX FORM GOES FIRST, AND THE ORDER IS LOAD-BEARING. Stripping the
 * block form first would leave a bare `{` and `}` behind, which can turn a JSX
 * expression container into what looks like an empty object literal. Removing
 * `{​/* … *​/}` whole leaves nothing at all, which is what it is.
 */
export function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * ⚠ The same thing, keeping line numbers intact — for an inventory that reports
 * `file:line`. ⚠⚠ A COMMENT BECOMES BLANK LINES RATHER THAN DISAPPEARING, so
 * the nth line of the result is still the nth line of the file.
 */
export function blankComments(src: string): string {
  const keepNewlines = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, keepNewlines)
    .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => p1);
}
