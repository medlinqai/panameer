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
    prisma.supportTicket.count({
      where: {
        created_at: { gte: since },
        date_solved: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);
  return { open, resolvedThisWeek };
}
