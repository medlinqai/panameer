/**
 * RETENTION — the mechanism, with the numbers deliberately absent
 * (`P1-ALL-E404` WS-4).
 *
 * ── ⚠⚠ THIS FILE DELETES NOTHING TODAY, AND THAT IS THE POINT ─────────────
 *
 * `E404`: *"BUILD NOTHING THAT DELETES UNTIL SCOTT NAMES THE WINDOW. Build the
 * mechanism, leave the value unset, and FAIL LOUDLY rather than defaulting."*
 *
 * A default here would be the worst outcome available: 30 or 90 or 365 days
 * chosen by an implementer, applied to real résumés, and indistinguishable
 * afterwards from a number somebody decided. So `RESUME_RETENTION_DAYS` is
 * `null`, `resumeRetentionCutoff()` THROWS, and `check:retention` asserts that
 * nothing calls a deletion path — the gate goes red the day a purge is wired
 * without a window.
 *
 * ── WHAT SCOTT DECIDED, AND WHAT HE DID NOT ───────────────────────────────
 *
 * Scott, 2026-09-09: *"i have no reason to keep the W9, the pull authorization,
 * or the resume. I am fine if we want to delete them."*
 *
 * ⚠⚠ HE IS RIGHT ABOUT ONE OF THE THREE. For the others the reason to keep is
 * not his — it is a regulator's:
 *
 *   · **RÉSUMÉ / `ProfileImport.raw_text`** — his to delete; nothing requires
 *     keeping it. ⚠ BUT IT IS LOAD-BEARING: `resume-ai/route.ts` re-parses from
 *     the stored text, so the re-read button dies with it. Deletion therefore
 *     means AFTER A WINDOW, and ⚠⚠ THE WINDOW IS SCOTT'S TO NAME.
 *   · **W-9** — the FORM may go; the DATA may not. A 1099 needs name, TIN and
 *     classification. The IRS states no W-9-specific period; the conventional
 *     anchor is the four years it sets for employment tax records. ⚠⚠ NOT SET
 *     HERE — that is Scott's accountant's call, not an implementer's.
 *   · **PULL AUTHORISATION** — moot. None is collected; see WS-5 and the
 *     `transaction-spine` docblock.
 *
 * ⚠ AND THIS UNBLOCKS `P1-A1.4-E399` WS-1. Persisting the raw model response was
 * stopped because it would be a second copy of the same PII under an absent
 * policy. Once a résumé window exists, the raw response inherits it — the same
 * row, the same clock. ⚠⚠ NOT IMPLEMENTED HERE; `E404` forbids it.
 */

/** What a retention rule can be applied to. */
export type RetainedKind = "RESUME_RAW_TEXT" | "TAX_FORM";

/**
 * ⚠⚠ UNSET ON PURPOSE. `null` is not "no limit" — it is "nobody has decided",
 * and the difference is the whole reason this file exists.
 */
export const RESUME_RETENTION_DAYS: number | null = null;

/**
 * ⚠ ALSO UNSET, AND FOR A DIFFERENT REASON. The résumé window is Scott's; this
 * one is his accountant's, because it is the number that decides whether
 * Panameer can still file or defend a 1099.
 */
export const TAX_FORM_RETENTION_DAYS: number | null = null;

export const RETENTION_DAYS: Record<RetainedKind, number | null> = {
  RESUME_RAW_TEXT: RESUME_RETENTION_DAYS,
  TAX_FORM: TAX_FORM_RETENTION_DAYS,
};

/** Thrown when something tries to delete against a window nobody set. */
export class RetentionUndecidedError extends Error {
  constructor(kind: RetainedKind) {
    super(
      `No retention window is set for ${kind}. A purge cannot run against an undecided rule — ` +
        `see lib/retention.ts. Scott names the résumé window; the tax-record period is his accountant's.`
    );
    this.name = "RetentionUndecidedError";
  }
}

/**
 * The cutoff a purge would delete before.
 *
 * ⚠⚠ IT THROWS RATHER THAN DEFAULTING. A function that quietly returned "now
 * minus 90 days" would delete real résumés on a number nobody chose, and the
 * evidence that nobody chose it would be gone with them. Failing loudly is the
 * only safe behaviour while the value is null.
 */
export function retentionCutoff(kind: RetainedKind, now = new Date()): Date {
  const days = RETENTION_DAYS[kind];
  if (days === null) throw new RetentionUndecidedError(kind);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** `true` once somebody has actually decided. Safe to call; never throws. */
export function retentionDecided(kind: RetainedKind): boolean {
  return RETENTION_DAYS[kind] !== null;
}
