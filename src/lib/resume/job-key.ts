/**
 * ── ⚠⚠⚠ THE ONE JOB KEY — `P2-A1.1-E740` (A2) ─────────────────────────────
 *
 * ⚠ SCOTT, super run 2026-09-30 item 6: *"use the import's own `haveRole`
 * matching; no second matcher."*
 *
 * ⚠⚠ **THERE WERE ALREADY TWO, AND THEY DISAGREED.** `import.ts` built its
 * `haveRole` key as `` `${employer}|${roleTitle}`.toLowerCase() `` — a PIPE —
 * while `rerun-diff.ts` built its `haveEmployers` key as
 * `` `${name} ${role_title}`.toLowerCase() `` — a SPACE.
 * ⚠⚠⚠ **SO THE WRITER AND THE PREVIEW COULD ANSWER "DO I ALREADY HOLD THIS
 * JOB?" DIFFERENTLY**, and the removal list is built on exactly that question:
 * a mismatch would have offered a member a job for deletion that the importer
 * was about to re-create, or hidden one it was not.
 *
 * ⚠ The pipe wins because the pipe is the WRITER's, and the writer is what
 * actually decides whether a row is created. ⚠⚠ A separator that cannot occur
 * inside a company name also keeps `"Acme | Lead"` from colliding with
 * `"Acme" + "| Lead"`, which a space does not.
 *
 * ⚠ `E585`: one concept, one place. Both callers import this.
 */
export function jobKey(
  employer: string | null | undefined,
  roleTitle: string | null | undefined
): string {
  return `${employer ?? ""}|${roleTitle ?? ""}`.toLowerCase().trim();
}
