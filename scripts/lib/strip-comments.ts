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
/**
 * ── ⚠⚠⚠ THE JSX PATTERN, AND THE BUG IT SHIPPED WITH ──────────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what `E591` WS-B shipped: the
 * same pattern as below, but with a LAZY body and no lookahead guarding it.
 *
 * ⚠⚠⚠ IT ATE WHOLE FUNCTION BODIES, AND IT DID IT SILENTLY. The opening brace
 * was free to match ANY brace — including the one that opens a function body —
 * and the lazy body then ran forward until it found a block terminator that
 * happened to be followed by a closing brace. (Both are described rather than
 * written: writing the terminator here would close THIS comment, which is rule
 * 12's trap and has now bitten six times.)
 * ⚠ On `(app)/community/page.tsx` that landed on the next JSX comment, forty
 * lines down, so everything between the two vanished from the scan.
 * ⚠⚠ MEASURED 2026-09-20: `check:community-page` reported `43/43 passed` while
 * half the page was invisible to it. ⚠ THE GATE WAS GREEN ABOUT NOTHING —
 * `E586`'s defect, reproduced by the very helper written to prevent a
 * measurement error.
 *
 * ⚠⚠ THE FIX IS THAT THE BODY MAY NOT CONTAIN A TERMINATOR — the negative
 * lookahead below forces the match to end at the FIRST one, so the closing
 * brace must follow it immediately or there is no match at that position.
 * ⚠ A lazy quantifier was never enough, because lazy means *"stop at the first
 * one that lets the REST of the pattern match"*, not *"stop at the first one"*.
 */
const JSX_COMMENT = /\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g;

export function stripComments(src: string): string {
  return src
    .replace(JSX_COMMENT, " ")
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
  /* ⚠ THE SAME CORRECTED PATTERN — this variant had the identical bug. */
  return src
    .replace(JSX_COMMENT, keepNewlines)
    .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => p1);
}
