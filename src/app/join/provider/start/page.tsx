import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { TestimonialCarousel } from "@/components/onboarding/TestimonialCarousel";
import { displayFirstName } from "@/lib/display";

export default async function GetStartedPage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=/join/provider/start");

  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      is_service_provider: true,
      user: { select: { email_verified: true } },
      providerProfile: { select: { id: true } },
    },
  });

  // Not a provider (or no profile) → let /join sort out where they belong.
  if (!person?.is_service_provider || !person.providerProfile) redirect("/join");
  // Still unverified → the wizard owns the verify gate.
  if (!person.user?.email_verified) redirect("/join/provider");

  const firstName = displayFirstName(person.first_name);

  return (
    <OnboardingShell
      footer={
        <>
          {}
          <Link
            href="/join/provider"
            className="ml-auto inline-flex justify-center bg-ink px-8 py-3.5 text-[17px] font-semibold text-surface transition-colors hover:bg-ink-hover"
          >
            Get Started Now!
          </Link>
        </>
      }
    >
      {}
      {}
      <div className="mx-auto w-full max-w-3xl">
        <div>
          <h1 className="text-[34px] tracking-[-0.8px] sm:text-[40px]">
            {}
            Welcome {firstName}.
          </h1>

          {}
          {}
          <div className="mt-7 flex items-center gap-4">
            <PersonIcon />
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Let&apos;s build an amazing profile so the work finds you!
            </p>
          </div>
        </div>

        {}
        {}
        <section className="mx-auto mt-10 w-full max-w-2xl">
          <TestimonialCarousel />
        </section>
        {}
        <p className="mt-10 text-center text-[14.5px] text-ink-2">
          It takes 3-5 minutes, you can edit it later, and we will save as you go.
        </p>
      </div>
    </OnboardingShell>
  );
}

function PersonIcon() {
  return (
    <span
      aria-hidden
      className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-ink/5 text-ink"
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
        <circle cx="12" cy="8" r="3.4" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    </span>
  );
}
