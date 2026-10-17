import { prisma } from "@/lib/prisma";

// PB-E001: a buyer waiting to join a company keeps going; only Submit / publish / accept-into-order waits.
export type PendingJoin = { companyId: string; company: string; admin: string };

/** The company this person is waiting to join — null once they belong to one (or never asked). */
export async function pendingJoin(personId: string): Promise<PendingJoin | null> {
  const [pending, approved] = await Promise.all([
    prisma.companyMembership.findFirst({ where: { person_id: personId, status: "PENDING" }, orderBy: { created_at: "desc" }, select: { company: { select: { id: true, name: true } } } }),
    prisma.companyMembership.findFirst({ where: { person_id: personId, status: "APPROVED" }, select: { id: true } }),
  ]);
  if (!pending || approved) return null;
  const admin = await prisma.companyMembership.findFirst({ where: { company_id: pending.company.id, role: "ADMIN", status: "APPROVED" }, orderBy: { created_at: "asc" }, select: { person: { select: { first_name: true, last_name: true } } } });
  const name = admin ? `${admin.person.first_name} ${admin.person.last_name.replace(/\s*\(\d+\)\s*$/, "").slice(0, 1)}.`.trim() : "the admin";
  return { companyId: pending.company.id, company: pending.company.name, admin: name };
}

export { waitingLine } from "@/lib/pending-join-copy";
import { waitingLine } from "@/lib/pending-join-copy";

export class PendingJoinError extends Error {
  constructor(public pending: PendingJoin) {
    super(waitingLine(pending));
    this.name = "PendingJoinError";
  }
}

/** Throws while the person is still waiting — Submit, publishing a Job, accepting into an order. */
export async function assertNotPending(personId: string): Promise<void> {
  const p = await pendingJoin(personId);
  if (p) throw new PendingJoinError(p);
}
