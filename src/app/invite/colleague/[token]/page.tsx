import Link from "next/link";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { lookupColleagueInvite } from "@/lib/colleague-invite";

export const metadata = { title: "You're Invited · Panameer" };

export default async function ColleagueInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await lookupColleagueInvite(token);

  return (
    <OnboardingShell compact>
      <div data-onboarding-page className="mx-auto w-full max-w-md border border-line bg-surface p-8 text-left">
        {!lookup.ok ? <ErrorState reason={lookup.reason} /> : <ValidState lookup={lookup} />}
      </div>
    </OnboardingShell>
  );
}

function ErrorState({ reason }: { reason: "invalid" | "expired" | "revoked" | "accepted" }) {
  const copy: Record<string, { title: string; body: string }> = {
    expired: {
      title: "Invitation Expired",
      body: "This invitation is older than 30 days. You can still join Panameer — it's free and open.",
    },
    revoked: {
      title: "Invitation Cancelled",
      body: "This invitation was cancelled. You can still join Panameer — it's free and open.",
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
      <h1 className="text-[23px] font-extrabold sm:text-[30px]">{c.title}</h1>
      <p className="mt-2 text-ink-2">{c.body}</p>
      <Link
        href={reason === "accepted" ? "/login" : "/join"}
        className="mt-6 inline-flex bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
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
      <h1 className="text-[23px] font-extrabold sm:text-[30px]">
        {lookup.firstName ? `Hi ${lookup.firstName} — ` : ""}You&apos;re Invited
      </h1>
      <p className="mt-2 text-ink-2">
        <b>{lookup.inviterName}</b> uses Panameer and thought you&apos;d want to
        see it.
      </p>

      {lookup.message && (
        <p className="mt-3 border-l-[3px] border-magenta bg-bg-soft px-4 py-3 text-[14px] italic text-ink-2">
          “{lookup.message}”
        </p>
      )}

      {/* WHAT IT IS, BEFORE IT ASKS FOR ANYTHING. The recipient may never have */}
      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        Panameer is a marketplace for Oracle and ERP services. Buyers describe
        the work they need; the people who do that work put their experience in
        front of them. It&apos;s free to join and free to look around.
      </p>

      <Link
        href="/join"
        className="mt-6 inline-flex bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
      >
        Join Panameer
      </Link>

      {/* SAYS WHAT IT IS NOT — the same disclosure the email carries. An */}
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
