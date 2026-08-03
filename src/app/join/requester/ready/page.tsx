import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { displayFirstName } from "@/lib/display";

/**
 * READY TO POST WORK REQUEST — the requester's end state (P1-J1.2 WS5).
 *
 * Every onboarding ends at a "ready" state that is the entry to the fulfillment
 * flow (requester_onboarding.md). This is the handoff, not the fulfillment: the
 * primary action goes to the Work Request builder, which already exists.
 *
 * It is a REAL PAGE rather than a redirect to /work/new because the ready state
 * is the thing being claimed — the requester has just answered five screens and
 * deserves to be told what they now have, and the CTA is a choice rather than a
 * shove into a second form.
 */
export default async function RequesterReadyPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/requester/ready");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      company: { select: { name: true } },
      requesterProfile: {
        select: {
          completed_at: true,
          approver_name: true,
          workSite: {
            select: { addresses: { take: 1, orderBy: { created_at: "asc" } } },
          },
        },
      },
    },
  });

  if (!person?.requesterProfile) redirect("/join");
  // Not finished → back to the wizard. The ready state is a claim, not a page
  // anyone can walk to by typing the URL.
  if (!person.requesterProfile.completed_at) redirect("/join/requester/steps");

  const a = person.requesterProfile.workSite?.addresses[0];
  const where = a
    ? [a.city, a.state, a.country].filter(Boolean).join(", ")
    : null;

  return (
    <OnboardingShell
      footer={
        <>
          <Link
            href="/dashboard"
            className="text-[15px] font-semibold text-ink-2 underline underline-offset-4 transition-colors hover:text-magenta"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/work/new"
            className="ml-auto inline-flex justify-center rounded-full bg-magenta px-8 py-3.5 text-[17px] font-bold text-white shadow-brand transition-colors hover:bg-magenta-dark"
          >
            Post a Work Request
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-2xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-magenta text-2xl font-black text-white">
          ✓
        </span>
        <h1 className="mt-6 text-[32px] tracking-[-0.7px] sm:text-[38px]">
          You&apos;re ready to post a work request.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
          {displayFirstName(person.first_name)}, you&apos;re set up under{" "}
          <b className="text-ink">{person.company?.name}</b>
          {where ? (
            <>
              {" "}
              with work delivered to <b className="text-ink">{where}</b>
            </>
          ) : null}
          {person.requesterProfile.approver_name ? (
            <>
              , approved by{" "}
              <b className="text-ink">{person.requesterProfile.approver_name}</b>
            </>
          ) : null}
          .
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {[
            {
              t: "Describe the work",
              d: "Role, skills, when it starts and how long it runs.",
            },
            {
              t: "Match providers",
              d: "We surface the people who fit and you invite them.",
            },
            {
              t: "Settle by the hour or milestone",
              d: "Payment setup happens on your company, before a work order goes out.",
            },
          ].map((c) => (
            <div key={c.t} className="rounded-brand border border-line p-5">
              <p className="font-bold">{c.t}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
