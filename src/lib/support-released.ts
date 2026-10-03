/**
 * SUPPORT COUNTS SCOPED TO RELEASED WORK (`P2-ALL-E810`).
 *
 * Scott, 2026-10-03: `/status` shows the support block only for released work —
 * hidden entirely until a Deploy ◆ is Done, and after that "the open/resolved
 * counts include only tickets on released phases."
 *
 * ⚠ THE HONEST LIMIT, STATED RATHER THAN PAPERED OVER: `SupportTicket` carries
 * no link to a plan row. It has `application` (free text) and nothing that names
 * a phase or a release, so a ticket CANNOT be attributed to a phase today.
 *
 * What is true and measurable is the DATE: nothing could have been reported
 * against released work before the first release went out. So the rule here is
 * "reported on or after the first Deploy ◆ marked Done", which is exactly right
 * while one release has shipped and becomes an approximation once two have —
 * at that point a ticket needs a column saying which phase it is about, and that
 * is a product decision, not something to guess from `application` text.
 */
import { prisma } from "@/lib/prisma";
import { TICKETS_TERMINAL_STATUSES } from "@/lib/support";

export type ReleasedSupport = { open: number; resolvedThisWeek: number };

export async function releasedSupportCounts(since: Date): Promise<ReleasedSupport> {
  const [open, resolvedThisWeek] = await Promise.all([
    prisma.supportTicket.count({
      where: {
        status: { notIn: TICKETS_TERMINAL_STATUSES },
        created_at: { gte: since },
      },
    }),
    /* `date_solved`, not `updated_at` — the column is derived from the status
       and cleared on reopen, so a re-opened ticket leaves the window instead of
       sitting in the wrong week. Seven days back from now, a rolling window. */
    prisma.supportTicket.count({
      where: {
        created_at: { gte: since },
        date_solved: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  return { open, resolvedThisWeek };
}
