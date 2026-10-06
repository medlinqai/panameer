import { guardPage } from "@/lib/guard";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { outgoingRequests } from "@/lib/connections";
import { WithdrawRequest } from "@/components/community/WithdrawRequest";
import { inviteAllowance, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";
import { InviteColleagueClient } from "@/components/console/InviteColleagueClient";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Invite a Colleague · Panameer" };

export default async function InviteColleaguePage() {
  const viewer = await guardPage("authenticated");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return <p className="text-ink-2">We couldn&apos;t find your profile.</p>;
  }

  const allowance = await inviteAllowance(person.id);

  const requests = await outgoingRequests(viewer);
  const sent = await prisma.colleagueInvite.findMany({
    where: { inviter_person_id: person.id },
    orderBy: { created_at: "desc" },
    take: 25,
    select: {
      id: true,
      invitee_email: true,
      invitee_first_name: true,
      status: true,
      created_at: true,
      expires_at: true,
    },
  });

  const emails = sent.map((s) => s.invitee_email);
  const joined = new Set(
    emails.length
      ? (
          await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { email: true },
          })
        ).map((u) => u.email)
      : []
  );

  const undelivered = new Map<string, string>();
  if (sent.length > 0) {
    const receipts = await prisma.sentEmail.findMany({
      where: {
        subject_type: "ColleagueInvite",
        subject_id: { in: sent.map((s) => s.id) },
        status: { in: ["bounced", "failed", "suppressed"] },
      },
      orderBy: { created_at: "desc" },
      select: { subject_id: true, status: true, created_at: true },
    });
    const latest = new Map<string, Date>();
    for (const r of receipts) {
      if (!r.subject_id) continue;
      const seen = latest.get(r.subject_id);
      if (seen && seen >= r.created_at) continue;
      latest.set(r.subject_id, r.created_at);
      undelivered.set(r.subject_id, r.status);
    }
  }

  const now = new Date();
  return (
    <div className="mx-auto max-w-3xl">
      {/* R-E012: a way back, above the title. */}
      <Link
        href={ROUTES.colleagues}
        className="text-[13px] font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline"
      >
        ← Back to Connections
      </Link>
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        Panameer is more useful the more of your field is on it. If you know
        someone who buys or delivers Oracle and ERP work, send them a look.
      </p>
      {/* R-E011: requests sent to people already on Panameer. The email
          invites below are the other half of the same question. */}
      {requests.length > 0 && (
        <section className="mb-6 border-t border-line pt-4">
          <h2 className="font-display text-[16px] font-bold">
            Requests sent to members ({requests.length})
          </h2>
          <ul className="mt-3">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-b border-line/60 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{r.name}</span>
                  {r.title && <span className="block text-[12.5px] text-ink-3">{r.title}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
                    Requested
                  </span>
                  <WithdrawRequest id={r.id} name={r.name} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <InviteColleagueClient
        dayRemaining={allowance.dayRemaining}
        dayLimit={INVITE_LIMIT_PER_DAY}
        sent={sent.map((s) => ({
          id: s.id,
          email: s.invitee_email,
          name: s.invitee_first_name,
          status: s.status,
          joined: joined.has(s.invitee_email),
          sentAt: s.created_at.toISOString(),
          expired: s.expires_at < now,
          undelivered: undelivered.get(s.id) ?? null,
        }))}
      />
    </div>
  );
}
