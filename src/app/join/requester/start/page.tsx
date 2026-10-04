import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { displayFirstName } from "@/lib/display";
import {
  REQUESTER_STEP_LABELS,
  REQUESTER_WORK_STEPS,
} from "@/lib/requester-steps";

const CARD_BLURBS: Record<(typeof REQUESTER_WORK_STEPS)[number], string> = {
  requester_info: "Who you are, and how a provider reaches you.",
  work_location: "The location providers deliver to.",
};

export default async function RequesterStartPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/requester/start");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      user: { select: { email_verified: true } },
      requesterProfile: { select: { id: true, completed_at: true } },
    },
  });

  // Not a requester → let /join sort out where they belong.
  if (!person?.requesterProfile) redirect("/join");
  // Still unverified → the pre-verify page owns the gate.
  if (!person.user?.email_verified) redirect("/join/requester");
  // Already finished → the ready state, not a second run at the intro.
  if (person.requesterProfile.completed_at) redirect("/join/requester/ready");

  const firstName = displayFirstName(person.first_name);

  return (
    <OnboardingShell
      footer={
        <>
          <p className="max-w-md text-[14.5px] text-ink-2">
            It takes about 3 minutes and you can edit it later. We&apos;ll save
            as you go.
          </p>
          <Link
            href="/join/requester/steps"
            className="ml-auto inline-flex justify-center rounded-full bg-magenta px-8 py-3.5 text-[17px] font-bold text-white shadow-brand transition-colors hover:bg-magenta-dark"
          >
            Get Started Now!
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-[34px] tracking-[-0.8px] sm:text-[40px]">
          Hey {firstName}. Ready to find the world&apos;s best talent?
        </h1>

        <div className="mt-7 flex items-center gap-4">
          <PeopleIcon />
          <p className="text-[16.5px] leading-relaxed text-ink-2">
            Tell us who you are and where the work happens — then post your first
            work request.
          </p>
        </div>

        {}
        <section
          className="mt-10 grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${REQUESTER_WORK_STEPS.length}, minmax(0, 1fr))`,
          }}
        >
          {REQUESTER_WORK_STEPS.map((step, i) => (
            <div key={step} className="rounded-brand border border-line p-5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-magenta/10 text-[13px] font-black text-magenta">
                {i + 1}
              </span>
              <p className="mt-3 font-bold">{REQUESTER_STEP_LABELS[step]}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
                {CARD_BLURBS[step]}
              </p>
            </div>
          ))}
        </section>
      </div>
    </OnboardingShell>
  );
}

/** Decorative glyph, the buyer-side counterpart of the provider intro's. */
function PeopleIcon() {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-magenta/10 text-magenta"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="8" r="3.2" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14.4A6.5 6.5 0 0 1 21.5 20" />
      </svg>
    </span>
  );
}
