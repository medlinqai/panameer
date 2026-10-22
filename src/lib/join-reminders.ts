import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { newTicketCode } from "@/lib/support";

// PB-E005: daily — a join request pending 2 business days reminds the company's admins once; at 4 a Panameer support ticket
// names the company, admin and requester (once). The requester only ever sees their banner.
export function businessDaysBetween(from: Date, to: Date): number {
  let n = 0;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  while (d.getTime() < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) n++;
  }
  return n;
}

const fullName = (p: { first_name: string; last_name: string } | null | undefined) => (p ? `${p.first_name} ${p.last_name}`.trim() : "");

export async function runJoinReminders(now: Date, opts: { dry?: boolean } = {}) {
  const pending = await prisma.companyMembership.findMany({
    where: { status: "PENDING", OR: [{ reminded_at: null }, { escalated_at: null }] },
    select: { id: true, created_at: true, reminded_at: true, escalated_at: true, person_id: true, person: { select: { first_name: true, last_name: true, user: { select: { email: true } } } }, company: { select: { id: true, name: true, p_account_id: true } } },
  });
  const remind: string[] = [];
  const escalate: string[] = [];
  for (const m of pending) {
    const days = businessDaysBetween(m.created_at, now);
    const who = `${fullName(m.person)} → ${m.company.name} (${days} business days)`;
    const admins = await prisma.companyMembership.findMany({ where: { company_id: m.company.id, role: "ADMIN", status: "APPROVED" }, select: { person_id: true, person: { select: { first_name: true, last_name: true, user: { select: { email: true } } } } } });
    if (days >= 2 && !m.reminded_at) {
      remind.push(who);
      if (!opts.dry) {
        for (const a of admins) await notify({ event: "company.join_reminder", personId: a.person_id, entityType: "company", entityId: m.company.id, dedupeKey: `company.join_reminder:${m.id}:${a.person_id}`, vars: { askerName: fullName(m.person), companyName: m.company.name } });
        await prisma.companyMembership.update({ where: { id: m.id }, data: { reminded_at: now } });
      }
    }
    if (days >= 4 && !m.escalated_at) {
      escalate.push(who);
      if (!opts.dry) {
        await fileSupportTicket(m, admins.map((a) => `${fullName(a.person)} <${a.person.user?.email ?? "no email"}>`), days);
        await prisma.companyMembership.update({ where: { id: m.id }, data: { escalated_at: now } });
      }
    }
  }
  return { dry: !!opts.dry, checked: pending.length, remind, escalate };
}

async function fileSupportTicket(
  m: { id: string; person: { first_name: string; last_name: string; user: { email: string } | null }; company: { name: string; p_account_id: string } },
  admins: string[],
  days: number,
) {
  // Filed as Panameer (the first system admin), so it sits in Admin › Support and never in the requester's own tickets.
  const panameer = await prisma.person.findFirst({ where: { user: { is_system_admin: true, is_active: true } }, orderBy: { created_at: "asc" }, select: { id: true, user: { select: { email: true } } } });
  if (!panameer) return;
  const requester = `${fullName(m.person)} <${m.person.user?.email ?? "no email"}>`;
  await prisma.supportTicket.create({
    data: {
      ticket_code: newTicketCode(),
      p_account_id: m.company.p_account_id,
      reporter_person_id: panameer.id,
      reporter_name: "Panameer (automatic)",
      reporter_email: panameer.user?.email ?? "",
      application: "Company",
      title: `Join request waiting ${days} business days — ${m.company.name}`,
      description: `${requester} asked to join ${m.company.name} and is still waiting.\nCompany admin(s): ${admins.join(", ") || "none on file"}.\nThey can shop and build a service requisition; only submitting waits. Please nudge the admin or help them decide.`,
      priority: "Medium",
      status: "Open",
      date_found: new Date(),
      last_message_at: new Date(),
    },
    select: { id: true },
  }).then((t) => prisma.ticketEvent.create({ data: { ticket_id: t.id, actor_person_id: panameer.id, kind: "filed" } }));
}
