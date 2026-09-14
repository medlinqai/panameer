import Link from "next/link";
import { Logo } from "@/components/Logo";
import { lookupColleagueInvite } from "@/lib/colleague-invite";

/**
 * COLLEAGUE INVITATION LANDING (`P2-J3-E493`). PUBLIC — the whole point is that
 * the person opening it has no account.
 *
 * ⚠⚠ THIS IS A SECOND ACCEPT SURFACE AND THAT IS DELIBERATE, NOT DUPLICATION.
 * `/invite/accept` is COORDINATOR-SHAPED THROUGHOUT — its copy reads
 * *"{coordinatorName} invited you to join Panameer as a service provider"*, its
 * four error states all say *"ask your coordinator"*, and accepting it calls a
 * server action that writes `coordinator_person_id` onto the invitee's
 * ProviderProfile and REFUSES anyone who has not got one. A colleague may be a
 * buyer, a requester, or nobody yet. Bending that page to cover both would have
 * meant a mode flag through every branch of it, including the accept.
 *
 * ⚠⚠ THIS PAGE WRITES NOTHING. A GET does not mutate, and there is nothing to
 * mutate anyway: the invitation confers NO relationship. It carries a name, a
 * note and a link to `/join` — the ordinary front door, which forks buyer/seller
 * itself. Nothing is pre-created for the invitee and no roster is touched.
 *
 * ⚠ THE TOKEN IS THE ACCESS CONTROL, the same reasoning `public-routes.ts`
 * category 4 already records for `/validate/[token]` and `/recommend/[token]`.
 */
export const metadata = { title: "You're Invited · Panameer" };

export default async function ColleagueInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await lookupColleagueInvite(token);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-soft px-6 text-center font-body text-ink">
      <Logo priority className="h-9 w-auto" />

      <div className="mt-10 w-full max-w-md rounded-brand border border-line bg-white p-8 text-left shadow-brand">
        {!lookup.ok ? <ErrorState reason={lookup.reason} /> : <ValidState lookup={lookup} />}
      </div>
    </div>
  );
}

/**
 * ⚠ NOT ONE OF THESE SENTENCES MENTIONS A COORDINATOR. The invitee has no
 * coordinator; they have somebody who thought they should take a look. Every
 * dead end offers the front door instead, because an expired invitation is not
 * a reason to stop somebody joining.
 */
function ErrorState({ reason }: { reason: "invalid" | "expired" | "revoked" | "accepted" }) {
  const copy: Record<string, { title: string; body: string }> = {
    expired: {
      title: "Invitation Expired",
      body: "This invitation is older than 30 days. You can still join Panameer — it's free and open.",
    },
    revoked: {
      title: "Invitation Withdrawn",
      body: "This invitation is no longer active. You can still join Panameer — it's free and open.",
    },
    accepted: {
      title: "Already Accepted",
      body: "This invitation has already been used. If that was you, log in.",
    },
    invalid: {
      title: "Invitation Not Found",
      body: "We couldn't find that invitation — the link may have been cut short by an email client. Ask whoever sent it to resend, or just join directly.",
    },
  };
  const c = copy[reason];
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-line text-2xl font-black text-ink-2">
        !
      </div>
      <h1 className="text-2xl font-extrabold tracking-[-0.5px]">{c.title}</h1>
      <p className="mt-2 text-ink-2">{c.body}</p>
      <Link
        href={reason === "accepted" ? "/login" : "/join"}
        className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
      >
        {reason === "accepted" ? "Log In" : "Join Panameer"}
      </Link>
    </div>
  );
}

function ValidState({
  lookup,
}: {
  lookup: Extract<Awaited<ReturnType<typeof lookupColleagueInvite>>, { ok: true }>;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-[-0.5px]">
        {lookup.firstName ? `Hi ${lookup.firstName} — ` : ""}You&apos;re Invited
      </h1>
      <p className="mt-2 text-ink-2">
        <b>{lookup.inviterName}</b> uses Panameer and thought you&apos;d want to
        see it.
      </p>

      {lookup.message && (
        <p className="mt-3 rounded-[12px] border-l-[3px] border-magenta bg-bg-soft px-4 py-3 text-[14px] italic text-ink-2">
          “{lookup.message}”
        </p>
      )}

      {/* ⚠ WHAT IT IS, BEFORE IT ASKS FOR ANYTHING. The recipient may never have
          heard of Panameer; a sign-up button with no explanation above it is how
          an invitation becomes spam. */}
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        Panameer is a marketplace for Oracle and ERP services. Buyers describe
        the work they need; the people who do that work put their experience in
        front of them. It&apos;s free to join and free to look around.
      </p>

      <Link
        href="/join"
        className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
      >
        Join Panameer
      </Link>

      {/* ⚠ SAYS WHAT IT IS NOT — the same disclosure the email carries. An
          invitation that does not disclaim a relationship reads as one, and
          this one creates nothing and shares nothing. */}
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-2">
        Nothing has been created for you, and {lookup.inviterName} can&apos;t see
        anything about you unless you join and choose to connect.
      </p>

      <p className="mt-3 text-[12.5px] text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-magenta">
          Log in
        </Link>
      </p>
    </div>
  );
}
