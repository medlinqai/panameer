import { prisma } from "@/lib/prisma";
import type { Ctx } from "@/lib/admin-usage/core";

// The list behind a count: rows with a link to the record. Every tab registers its own.
export type ListData = { title: string; head: string[]; rows: { cells: (string | number)[]; href?: string }[] };
export type Lists = Record<string, () => Promise<ListData>>;

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");

/** People (by user id) — name, email, joined; links to Admin › Users. */
export async function peopleList(title: string, userIds: string[], extra?: (id: string) => string | number): Promise<ListData> {
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(userIds)] } }, orderBy: { created_at: "desc" }, take: 500, select: { id: true, email: true, created_at: true, person: { select: { id: true, first_name: true, last_name: true } } } });
  return {
    title,
    head: ["Member", "Email", "Joined", ...(extra ? [""] : [])],
    rows: users.map((u) => ({ cells: [u.person ? `${u.person.first_name} ${u.person.last_name}`.trim() : "—", u.email, day(u.created_at), ...(extra ? [extra(u.id)] : [])], href: u.person ? `/admin/users/${u.person.id}` : undefined })),
  };
}

export const personUsers = (c: Ctx, personIds: (string | null | undefined)[]) => personIds.map((p) => (p ? c.personUser.get(p) : undefined)).filter((x): x is string => !!x);
export { day as isoDay };
