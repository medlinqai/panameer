import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { TestimonialCarousel } from "@/components/onboarding/TestimonialCarousel";
import { displayFirstName } from "@/lib/display";

/**
 * "Get Started Now!" — the intro page (brief_P / E002), and per E008 the FIRST
 * page of the profile-building process: verify email → HERE → step 1/12.
 *
 * Pre-profile, so it deliberately carries NO stepper (E003) — the counter is
 * introduced on step 1.
 */
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
    // E049 — the stock onboarding shell at max-w-3xl. This page had its own
    // copy of the chrome at max-w-5xl, which is why it read as a different
    // product from the pages either side of it.
    <OnboardingShell>
      {/*
        Layout per E023, UNCHANGED: greeting + blurbs + CTA on the LEFT, a
        single example card on the RIGHT. Only the column widths are retuned —
        the card column drops 400px → 300px and the gap 12 → 8 so the two
        columns still breathe inside the narrower stock frame, and it stacks to
        one column below `lg` exactly as before.
      */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
        <div>
          <h1 className="text-[30px] tracking-[-0.7px] sm:text-[34px]">
            Hey {firstName}. Ready for your next big opportunity?
          </h1>

          <div className="mt-6 space-y-4">
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Answer a few questions and start building your profile. It&apos;s
              how clients find you and understand what you do best.
            </p>
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Apply for open roles and list services for clients to buy — on
              your terms, at the rate you set.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/join/provider"
              className="inline-flex rounded-full bg-magenta px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Get Started Now!
            </Link>
            <p className="mt-3 text-[14px] text-ink-2">
              It only takes 5–10 minutes and you can edit it later. We&apos;ll
              save as you go.
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-ink-2">
            Providers on Panameer
          </h2>
          <TestimonialCarousel />
        </section>
      </div>
    </OnboardingShell>
  );
}
