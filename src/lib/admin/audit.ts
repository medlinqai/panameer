/**
 * ── THE ADMIN AUDIT LOG'S ONE WRITER (`P2-ALL-E793`) ────────────────────────
 *
 * ⚠ **SCOTT, 2026-10-03:** *"a deletion the app can't show is the failure this
 * lane exists to end."* His test users vanished in the 2026-09-20 reset and the
 * app had nothing to say about it.
 *
 * ⚠⚠ **EVERY ADMIN CHANGE AND EVERY SYSTEM DELETION GOES THROUGH HERE.** One
 * writer, so a new action cannot invent its own shape — and so a gate can assert
 * that the destructive paths call it (which it does).
 *
 * ⚠⚠⚠ **IT CAN NEVER FAIL THE ACTION IT RECORDS.** The change has already
 * happened by the time this runs; a throw here would turn a logging outage into
 * an admin outage. Caught, logged to the console, not rethrown — the same shape
 * `E522`'s `SentEmail` receipt uses, and for the same reason.
 * ⚠ The cost is stated rather than hidden: a failed write means a missing row,
 * which is why the action name is also printed to the server log.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

export type AuditEntry = {
  action: string;
  targetTable: string;
  targetId?: string | null;
  /** ⚠ Scott asked for "who, when, field, before → after" — the pair lives here
   *  so the log reads without a second query. */
  detail?: Record<string, unknown> | null;
  rowCount?: number;
};

export async function writeAudit(viewer: Viewer | null, entry: AuditEntry): Promise<void> {
  try {
    /**
     * ⚠⚠ THE EMAIL IS LOOKED UP, NOT TAKEN FROM THE SESSION — `Viewer` carries
     * only `userId`. One extra read per admin action, which is the right price
     * for a row that has to stay readable after the address changes.
     */
    const actorEmail = viewer
      ? (await prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } }))?.email ?? null
      : null;
    await prisma.adminAudit.create({
      data: {
        /** ⚠ From the SESSION, never from a client (load-bearing rule 5). */
        actor_id: viewer?.userId ?? null,
        actor_email: actorEmail,
        action: entry.action,
        target_table: entry.targetTable,
        target_id: entry.targetId ?? null,
        detail: (entry.detail ?? undefined) as never,
        row_count: entry.rowCount ?? 1,
      },
    });
  } catch (e) {
    console.error(`[audit] FAILED to record ${entry.action} on ${entry.targetTable}:`, e);
  }
}

/** The before/after shape for a field edit, so every caller records it the same. */
export function fieldChange(field: string, before: unknown, after: unknown) {
  return { field, before: before ?? null, after: after ?? null };
}

/**
 * A DELETION A SCRIPT MADE (`P2-ALL-E814`).
 *
 * Scott: "any script that deletes data must write to the audit log from now on
 * — a deletion the app can't show is the failure this lane exists to end."
 *
 * No `Viewer`, because a script has none: the actor is recorded as the script's
 * own name so the log says what ran rather than inventing a person.
 */
export async function reportDeletion(entry: {
  script: string;
  table: string;
  rowCount: number;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.adminAudit.create({
      data: {
        actor_id: null,
        actor_email: `script:${entry.script}`,
        action: "script.delete",
        target_table: entry.table,
        target_id: null,
        row_count: entry.rowCount,
        detail: (entry.detail ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* A log failure must never turn a cleanup into an error — the deletion has
       already happened, and losing the record is bad but losing the script run
       on top of it is worse. */
  }
}
