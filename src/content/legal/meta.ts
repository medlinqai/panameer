/**
 * When the draft legal text was loaded (brief_legal_pages_content WS-A).
 *
 * A LOAD DATE, NOT AN EFFECTIVE DATE. Nothing here is in force yet, so this
 * says when the words on the page last changed and nothing more. When counsel
 * approves the final documents, this becomes their effective date and
 * `USER_TOS_VERSION` in `src/lib/tos.ts` is bumped so every user is asked to
 * accept again.
 *
 * Hand-maintained rather than generated from file mtimes: a checkout or a
 * rebase would rewrite an mtime and silently re-date a legal document.
 */
export const LEGAL_UPDATED = "5 August 2026";
