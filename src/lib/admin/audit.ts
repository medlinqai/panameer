import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

export type AuditEntry = {
  action: string;
  targetTable: string;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
  rowCount?: number;
};

export async function writeAudit(viewer: Viewer | null, entry: AuditEntry): Promise<void> {
  try {
    const actorEmail = viewer
      ? (await prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } }))?.email ?? null
      : null;
    await prisma.adminAudit.create({
      data: {
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

/** A DELETION A SCRIPT MADE . */
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
