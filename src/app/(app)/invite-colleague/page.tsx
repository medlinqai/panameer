import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { inviteAllowance, INVITE_LIMIT_PER_DAY } from "@/lib/colleague-invite";
import { InviteColleagueClient } from "@/components/console/InviteColleagueClient";

/**
 * INVITE A COLLEAGUE (`P2-J3-E493`).
 *
 * > **SCOTT, 2026-09-13:** *"can we add an 'Invite a Colleague' page (looks like
 * > image 3, but requesting the person being emailed to connect to panameer)?
 * > This would be under the request recommendation option on the Setting menu."*
 *
 * ⚠ "IMAGE 3" WAS NEVER SENT — only two screenshots arrived. The template is
 * `/recommendations`, the page this one sits directly beneath in the Account
 * menu: same shell, same server-read + client-composer split, same form rhythm.
 * ⚠ REPORTED AS A READING, not asserted as fact.
 *
 * ⚠⚠ BUT THE ASK IS DIFFERENT AND THE COPY IS NOT BORROWED. Request
 * Recommendations asks somebody to VOUCH FOR YOU. This asks somebody to JOIN
 * PANAMEER. A vouch request and an invitation are different asks and reading
 * alike would make both of them vaguer.
 *
 * ⚠ `authenticated`, NOT `canProvideServices` — the same correction `E044` made
 * to `/recommendations`. Anyone with an account has colleagues; gating this to
 * sellers would turn a visible menu item into a bounce for every buyer.
 * ⚠⚠ AND UNLIKE `/recommendations` THERE IS NO PROVIDER-PROFILE GUARD, because
 * a ColleagueInvite hangs off a PERSON, not a ProviderProfile. That was the
 * load-bearing guard there; here it would be a bug.
 */
export const metadata = { title: "Invite a Colleague · Panameer" };

export default async function InviteColleaguePage() {
  const viewer = await guardPage("authenticated");

  /* ⚠ OWNER-SCOPED: the person is resolved FROM THE SESSION, never from input. */
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) {
    return <p className="text-ink-2">We couldn&apos;t find your profile.</p>;
  }

  const allowance = await inviteAllowance(person.id);

  /* ⚠ THE INVITATIONS ALREADY SENT — an honest record, so nobody re-invites the
     same colleague twice and wonders why nothing happened. */
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

  /*
    ⚠⚠ "JOINED" IS DERIVED, NOT STORED, AND THAT IS THE POINT OF THE DESIGN.
    Nothing flips `status` to ACCEPTED, because nothing is allowed to: the
    landing page is a GET and a GET does not mutate, and accepting confers NO
    relationship to record — the invitee just goes to `/join` like anybody else.
    So the honest answer to "did they join?" is "does an account exist for that
    address?", asked here, once, over the 25 rows on screen.

    ⚠ `status` IS STILL A REAL COLUMN — REVOKED is a state a person sets, and
    ACCEPTED/`accepted_at` are there for the day an account-create hook writes
    them. ⚠ THIS PAGE DOES NOT INVENT THAT HOOK; that would be a change to
    signup, which this brief does not open.

    ⚠ IT DISCLOSES NOTHING NEW. `inviteColleague` already refuses with
    `already_member` for exactly this fact, to exactly this person.
  */
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

  /*
    ── ⚠⚠ DID THE INVITATION ACTUALLY ARRIVE (`P2-J3-E522` PART A) ────────────

    ⚠ THE DEFECT THIS CLOSES, AND IT IS THE ONE THAT STARTED THE BRIEF: a send
    that never arrived left no trace, so the row said "Invited" forever. Scott's
    own `straterp.cpm` typo survived three attempts and the product never said
    otherwise.

    ⚠⚠ READ, NOT DENORMALISED. `SentEmail` already carries the outcome and
    points back with `subject_type`/`subject_id`, so a column on
    `ColleagueInvite` would duplicate it and could disagree with it. ⚠ Scott,
    2026-09-17, confirming his earlier ruling was about `status` and not a new
    column: *"bounce is derivable from SentEmail and a denormalised column would
    duplicate it… Read it."*

    ⚠⚠⚠ `complained` IS NOT IN THIS SET, AND THAT IS THE WHOLE CARE OF IT. A
    complaint means the mail ARRIVED and the person pressed "spam". Showing
    "Not delivered" there would be a FLAT LIE to the sender, and it would send
    them chasing a typo that does not exist. ⚠ `bounced`, `failed` and
    `suppressed` all mean it did not land; only those three.
  */
  const undelivered = new Map<string, string>();
  if (sent.length > 0) {
    const receipts = await prisma.sentEmail.findMany({
      where: {
        subject_type: "ColleagueInvite",
        subject_id: { in: sent.map((s) => s.id) },
        status: { in: ["bounced", "failed", "suppressed"] },
      },
      /* ⚠ NEWEST FIRST: a resend that succeeded must not be overruled by an
         older failure, so the most recent receipt is the one that counts. */
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
      {/* ⚠ THE SAME `max-w-3xl` AND INTRO RHYTHM `/recommendations` USES — this
          page sits directly beneath it in the Account menu and two neighbouring
          pages at two different widths read as a mistake. */}
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        Panameer is more useful the more of your field is on it. If you know
        someone who buys or delivers Oracle and ERP work, send them a look.
      </p>
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
          /* ⚠ The receipt's own word (`bounced` / `failed` / `suppressed`), so
             the CLIENT never has to re-derive what "did not arrive" means. */
          undelivered: undelivered.get(s.id) ?? null,
        }))}
      />
    </div>
  );
}
