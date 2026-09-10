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

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠ THE RÉSUMÉ RULE, NAMED — AND IT IS NOT A CLOCK (`P1-A1.4-E413` WS-7)
   ═══════════════════════════════════════════════════════════════════════════

   SCOTT, 2026-09-10, asked to name the window and did:
   *"keep for the life of the account OR if a new resume is uploaded."*

   ── ⚠⚠ THE STOP CONDITION THIS BRIEF SET, AND IT IS REACHED ────────────────

   `E413` WS-7: *"It is a supersession rule, not a clock — REPORT whether the
   mechanism as built can express that, and STOP AND REPORT if it is shaped
   around a day count and cannot."*

   ⚠⚠ IT IS, AND IT CANNOT. Everything above this line is a DAY COUNT:
   `RESUME_RETENTION_DAYS` is a `number | null`, `retentionCutoff()` returns
   `now − days`, and a purge built on it deletes rows OLDER THAN a date. Scott's
   rule has no date in it. There is no number of days that means "until it is
   replaced" — 0 would delete on upload, and any positive number would delete a
   résumé nobody replaced, which is the opposite of what he said.

   ⚠ SO NO NUMBER WAS INVENTED TO FIT. `RESUME_RETENTION_DAYS` stays `null` and
   `retentionCutoff("RESUME_RAW_TEXT")` still THROWS — `E404`'s protection is
   untouched, because a time-based résumé purge is still undecided and must
   still fail loudly. What is added is a SECOND, correctly-shaped rule beside
   it, with its own name, that says what Scott actually said.

   ⚠ THE TWO HALVES OF HIS SENTENCE MAP CLEANLY:
     · *"for the life of the account"* — nothing time-based deletes a résumé.
       ⚠ ALREADY TRUE AND ALREADY ENFORCED: `ProfileImport` cascades from
       `ProviderProfile`, so closing the account takes the row with it. No code
       was needed and none was written.
     · *"or if a new resume is uploaded"* — SUPERSESSION, below. This is the
       half that is new.

   ⚠ THE W-9 HALF OF `E404` IS MOOT AND `E413` SAYS SO: `TaxProfile` stores
   `tin_last4` only, so there is no full TIN to retain and no tax-form retention
   path is built. `TAX_FORM_RETENTION_DAYS` stays null for the same reason it
   always was — it is the accountant's number, and nothing now depends on it.

   ⚠ AND THIS INHERITS TO `P1-A1.4-E399` WS-1. Persisting the raw model response
   was stopped for being a second copy of the same PII under an absent policy.
   The policy exists now and the raw response would fall under THIS rule — same
   row, superseded together. ⚠⚠ NOT BUILT HERE; `E413` forbids it and Scott
   decides when. */

/**
 * What a superseding upload destroys, and what it deliberately keeps.
 *
 * ⚠⚠ THE DOCUMENT IS STORED TWICE AND BOTH COPIES GO. `raw_text` is the
 * extracted plain text; `storage_path` points at THE ORIGINAL FILE in the
 * private `resumes` bucket. ⚠ Nulling the column and leaving the object in the
 * bucket is not deletion — it is the APPEARANCE of deletion, which is worse
 * than none, because it reads as done.
 *
 * ⚠ THE ROW ITSELF STAYS. `id`, timestamps, `status`, `ai_model`,
 * `ai_provider`, the token counts and `ai_cost_usd` are the cost and audit
 * trail; they carry no résumé content and answer "what did we spend and which
 * model produced this".
 *
 * ⚠⚠ `parsed` AND `gaps` ARE KEPT, AND THAT IS A DECISION WITH A REASON, not a
 * default. They are derived STRUCTURE, not the document: every name, employer
 * and date in `parsed` is already a first-class row in `employers`, `projects`
 * and `certifications`, in the open, where the provider edits it — so deleting
 * it removes no PII the profile does not already hold. ⚠ AND `parsed` IS WHAT
 * THE REVIEW SCREEN READS: purging it on supersession would blank a screen
 * somebody may still be standing on. ⚠ It is one line to reverse if Scott wants
 * the stricter rule; the payload columns are named here rather than inlined at
 * the call site so there is one place to change.
 */
export const SUPERSEDED_RESUME_PAYLOAD = {
  /** Nulled on the row. */
  columns: ["raw_text"] as const,
  /** Deleted from the private bucket. */
  objects: ["storage_path"] as const,
  /** Kept, with the reasons above. */
  kept: ["parsed", "gaps", "status", "ai_model", "ai_cost_usd", "file_name"] as const,
};

/**
 * ⚠⚠ THE ORDER IS THE WHOLE CORRECTNESS ARGUMENT, and it is why this is a
 * named constant rather than a comment somebody can drift from.
 *
 * ⚠ THE NEW IMPORT MUST SUCCEED BEFORE THE OLD ONE IS PURGED. A purge-then-parse
 * order loses the only copy when a parse fails — and parses DO fail here: `E410`
 * WS-3's measurement puts a `shape` failure on 2 of 5 inventory runs over the
 * same document, and a retry reproduces it as often as it clears it. Somebody
 * uploading a second CV that the model chokes on must still have their first.
 */
export const PURGE_ONLY_AFTER_SUCCESS = true;
