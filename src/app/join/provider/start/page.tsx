import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { Logo } from "@/components/Logo";
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
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center">
          <Logo priority />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-[30px] font-extrabold tracking-[-0.7px] sm:text-[38px]">
          Hey {firstName}. Ready for your next big opportunity?
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <p className="rounded-brand border border-line p-5 text-[16px] leading-relaxed text-ink-2">
            Answer a few questions and start building your profile. It&apos;s how
            clients find you and understand what you do best.
          </p>
          <p className="rounded-brand border border-line p-5 text-[16px] leading-relaxed text-ink-2">
            Apply for open roles and list services for clients to buy — on your
            terms, at the rate you set.
          </p>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-[15px] font-bold uppercase tracking-wide text-ink-2">
            Providers on Panameer
          </h2>
          <TestimonialCarousel />
        </section>

        <div className="mt-12 border-t border-line pt-8">
          <Link
            href="/join/provider"
            className="inline-flex rounded-full bg-magenta px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Get Started Now!
          </Link>
          <p className="mt-3 text-[14px] text-ink-2">
            It only takes 5–10 minutes and you can edit it later. We&apos;ll save
            as you go.
          </p>
        </div>
      </main>
    </div>
  );
}
