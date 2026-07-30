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
    <OnboardingShell
      /*
        WS3 — the caption and the primary CTA move into the shared footer band
        (caption left, button right) instead of sitting stacked mid-page under
        the blurbs. That is where the design puts them, and it is the same band
        every wizard step now carries, so this page stops being the odd one out.
      */
      footer={
        <>
          <p className="max-w-md text-[14.5px] text-ink-2">
            It only takes 5–10 minutes and you can edit it later. We&apos;ll save
            as you go.
          </p>
          <Link
            href="/join/provider"
            className="ml-auto inline-flex justify-center rounded-full bg-magenta px-8 py-3.5 text-[17px] font-bold text-white shadow-brand transition-colors hover:bg-magenta-dark"
          >
            Get Started Now!
          </Link>
        </>
      }
    >
      {/*
        Greeting + blurbs LEFT, the example card RIGHT (E023). The card column is
        460px so the flanking arrows can sit outside the card with a real gap and
        still leave it above the 340px it needs for the large-card treatment —
        the widened frame (WS2/E081) is what paid for that.
      */}
      <div className="grid gap-12 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          <h1 className="text-[32px] tracking-[-0.7px] sm:text-[36px]">
            Hey {firstName}. Ready for your next big opportunity?
          </h1>

          {/*
            E002/E023 — each blurb is its own row with a person glyph and a thin
            separator, rather than two loose paragraphs.
          */}
          <ul className="mt-9 space-y-1">
            {[
              "Answer a few questions and start building your profile. It's how clients find you and understand what you do best.",
              "Apply for open roles and list services for clients to buy — on your terms, at the rate you set.",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-4 border-b border-line py-5 last:border-b-0"
              >
                <PersonIcon />
                <p className="text-[16.5px] leading-relaxed text-ink-2">{line}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* E064(a) — the "Providers on Panameer" label is gone; the card speaks
            for itself and the label was competing with the greeting. */}
        <section>
          <TestimonialCarousel />
        </section>
      </div>
    </OnboardingShell>
  );
}

/** The person glyph on each blurb row (E002/E023). Decorative. */
function PersonIcon() {
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
        <circle cx="12" cy="8" r="3.4" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    </span>
  );
}
