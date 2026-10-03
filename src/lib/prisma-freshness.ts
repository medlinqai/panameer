/**
 * ── ⚠⚠⚠ IS THE PRISMA CLIENT THIS PROCESS LOADED STILL CURRENT? (`E799`) ────
 *
 * ⚠ **WRITTEN BECAUSE IT COST SCOTT A WORKING PAGE AND COST ME AN HOUR OF
 * MISDIRECTION, 2026-10-03.** `/admin/buyers-sellers` threw
 * `Unknown field is_test for select statement on model User` — a column that
 * plainly exists — and what he SAW was *"Encountered a script tag while
 * rendering React component"*, because the server component threw, Next's dev
 * overlay re-rendered the document, and React re-created the root layout's
 * `<head>` script.
 * ⚠⚠⚠ **SO THE REPORTED ERROR NAMED THE WRONG FILE, THE WRONG LAYER AND A
 * DELIBERATE DESIGN DECISION** (`layout.tsx:163`, which Scott had ruled on and
 * which was innocent). ⚠ The real fact was mechanical: his dev server started at
 * **00:05:34** and the client was generated at **14:12:19** — fourteen hours
 * later — so the process held the pre-`is_test` client.
 *
 * ⚠⚠ **TWO FAILURES, AND THEY NEED DIFFERENT SENTENCES:**
 *   · the client on disk is older than the schema → **generate**;
 *   · the client on disk is newer than this process → **restart**.
 * ⚠⚠⚠ **THE SECOND IS THE ONE EVERY DOC MISSES.** `CLAUDE.md` already warns
 * that `db:push` does not regenerate the client, and the fix it gives —
 * `npx prisma generate` — does nothing for a server that is already running.
 *
 * ⚠⚠ **IT COMPARES TIMESTAMPS AND PARSES NOTHING.** A field-by-field diff of
 * `schema.prisma` would have to skip comments, `@@map`s and the `E164` quotes
 * this codebase is full of, and a guard that cries wolf is a guard somebody
 * switches off (ruling 10).
 */

export type Freshness = {
  /** `null` when nothing is wrong — the only shape a caller should act on. */
  problem: "generate" | "restart" | null;
  message: string | null;
};

export type FreshnessInput = {
  /** mtime of `prisma/schema.prisma`, in ms. */
  schemaMs: number | null;
  /** mtime of the generated client's own schema copy, in ms. */
  clientMs: number | null;
  /** when this process started, in ms. */
  processStartMs: number;
};

/**
 * ⚠ A whole second of slack. `prisma generate` writes both files inside the same
 * second often enough that a strict `>` would fire on a perfectly fresh pair.
 */
const SLACK_MS = 1_000;

export function freshness({ schemaMs, clientMs, processStartMs }: FreshnessInput): Freshness {
  /**
   * ⚠⚠ UNKNOWN IS NOT BROKEN. A missing file means this ran somewhere the check
   * cannot see — a bundled production server, a container without the schema —
   * and guessing there would produce a warning nobody can act on.
   */
  if (schemaMs === null || clientMs === null) return { problem: null, message: null };

  if (schemaMs > clientMs + SLACK_MS) {
    return {
      problem: "generate",
      message:
        "prisma/schema.prisma is newer than the generated client. Run `npx prisma generate` " +
        "(then restart this server) or the next query fails with `Unknown field` on a column that exists.",
    };
  }

  /**
   * ⚠⚠⚠ THE CASE THAT BIT. The client on disk is fine; THIS PROCESS loaded an
   * older one and holds it in memory, and no amount of regenerating changes
   * that. ⚠ Turbopack also bakes it into `.next/dev` chunks, which is why the
   * order is: stop the server, clear `.next`, start it again.
   */
  if (clientMs > processStartMs + SLACK_MS) {
    return {
      problem: "restart",
      message:
        "The Prisma client was regenerated after this server started, so this process is still " +
        /** ⚠ The word "restart" is in the sentence deliberately — it is what
         *  somebody greps for, and `check:prisma-freshness` §4 asserts it. */
        "using the OLD one. RESTART it: stop the server, `rm -rf .next`, then start it again — in that order.",
    };
  }

  return { problem: null, message: null };
}
