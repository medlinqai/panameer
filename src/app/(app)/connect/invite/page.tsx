import { guardPage } from "@/lib/guard";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inviteAllowance, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";
import { InviteColleagueClient } from "@/components/console/InviteColleagueClient";
import { ROUTES } from "@/lib/routes";

export const metadata = { title: "Invite Someone to Panameer · Panameer" };

// Connect › Invite Someone to Panameer (2026-10-08): invitations to people not on Panameer yet. Member requests live in Connections › Requests.
export default async function JoinPanameerPage() {
  const viewer = await guardPage("authenticated");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return <p className="text-ink-2">We couldn&apos;t find your profile.</p>;
  }

  const allowance = await inviteAllowance(person.id);

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
  const joinedAt = new Map(
    emails.length
      ? (
          await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { email: true, created_at: true },
          })
        ).map((u) => [u.email, u.created_at] as const)
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
      <Link
        href={ROUTES.colleagues}
        className="text-[13px] font-bold text-ink-2 underline-offset-4 hover:text-magenta hover:underline"
      >
        ‹ Back to Connections
      </Link>
      <h1 className="mt-3 font-display text-[28px] font-bold tracking-[-0.5px]">Invite Someone to Panameer</h1>
      <p className="mb-5 mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        Invite someone who isn&apos;t on Panameer yet. They get one email from you with a link to take a look.
      </p>

      <InviteColleagueClient
        dayRemaining={allowance.dayRemaining}
        dayLimit={INVITE_LIMIT_PER_DAY}
        sent={sent.map((s) => ({
          id: s.id,
          email: s.invitee_email,
          name: s.invitee_first_name,
          status: s.status,
          joined: joinedAt.has(s.invitee_email),
          joinedAt: joinedAt.get(s.invitee_email)?.toISOString() ?? null,
          sentAt: s.created_at.toISOString(),
          expired: s.expires_at < now,
          undelivered: undelivered.get(s.id) ?? null,
        }))}
      />
    </div>
  );
}
