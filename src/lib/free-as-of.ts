/**
 * ── ⚠⚠⚠ ONE DEFINITION OF THE "AS OF" DATE (`P2-A1.1-E734`) ─────────────────────────────
 *
 * ⚠ **SCOTT: *"Every 'free' carries an 'as of' date, because pricing may change: 'Free as
 * of October 2026.' One definition of that date, in one place (`E585`), so updating it is
 * one edit."***
 *
 * ⚠⚠ **IT IS A TYPED CONSTANT, NOT A COMPUTED `new Date()`.** A date derived from the clock
 * would silently re-date every claim on the page each month — ⚠⚠⚠ **WHICH WOULD MAKE THE
 * SENTENCE SAY THE PRICE WAS CHECKED THIS MONTH WHEN NOBODY CHECKED IT.** The whole point
 * of an "as of" is that a person asserted it on a date.
 * ⚠ Changing it is one edit here and nowhere else.
 */
export const FREE_AS_OF = "October 2026";

/** ⚠ The exact sentence, so six surfaces cannot word it six ways. */
export const FREE_AS_OF_LINE = `Free as of ${FREE_AS_OF}.`;
