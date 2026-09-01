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
          {/*
            NO BACK BUTTON (E148). walk_run7 added one because the E100 mockup
            draws it; the MASTER brief removes it. That is the right call for
            this screen — the account already exists by the time anyone sees it,
            so "Back" pointed at a fork whose answer had already been acted on.
            The caption stays, as the brief specifies.
          */}
          <p className="max-w-md text-[14.5px] text-ink-2">
            {/* ⚠ SCOTT'S WORDS, VERBATIM (`E291`). ⚠ SUPERSEDED, quoted: *"It only
                takes 5–10 minutes and you can edit it later. We'll save as you go."*
                ⚠ HIS `3-5` USES A PLAIN HYPHEN where the old string used an en dash.
                SHIPPED AS TYPED — do not normalise it back.
                ⚠ TYPO CORRECTED, AND IT IS THE ONLY ONE: he typed `an we will`; this
                ships `and we will`.
                ⚠⚠ LAYOUT NOT MOVED, DELIBERATELY. `E291` also asks for this line to sit
                ABOVE the horizontal rule rather than in the action bar, but that
                placement came from Scott's WORDS ONLY — the reference images that
                reached chat were duplicates — and the brief says to confirm with him
                before shipping the move. The COPY is safe either way, so the copy ships
                and the move waits on him. */}
            It takes 3-5 minutes, you can edit it later, and we will save as you go.
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
      {/*
        E100 — STACKED, and the copy cut.

        It was two columns wedged into the frame with the greeting, two
        paragraphs of blurb and a 460px card all competing for width, so the text
        column ran narrow and the page read cramped ("looks like poop"). Stacking
        gives the greeting the full column, and the example card sits beneath it
        with room rather than squeezing the words beside it.

        `lg:items-center` is also gone — E101 top-justifies everything, and this
        page was the loudest example of content floating in the middle of a band
        of empty space.
      */}
      <div className="mx-auto w-full max-w-3xl">
        <div>
          <h1 className="text-[34px] tracking-[-0.8px] sm:text-[40px]">
            {/* ⚠ SCOTT'S WORDS, VERBATIM (`P1-J1.1-E290`, 2026-08-31).
                ⚠ SUPERSEDED, quoted: *"Hey {firstName}. Are you ready for your next big
                opportunity?"*
                ⚠ NO COMMA AFTER `Welcome`, NO FULL STOP — exactly as he typed it.
                ⚠ THE PURPOSE OF THE PAGE NOW SITS IN THE LINE UNDER THE TITLE
                (*"Let's build an amazing profile so the work finds you!"*), which is
                unchanged and is the point of this change — Scott: *"(the lets build a
                profile text in under the title)"*. */}
            Welcome {firstName}
          </h1>

          {/*
            E002/E023 — each blurb is its own row with a person glyph and a thin
            separator, rather than two loose paragraphs.
          */}
          {/*
            ONE line, per E100-get-started.png. The page carried two bullet rows
            with separators; the mockup carries a single sentence beside the
            glyph, and the brief flags this design as one that has been missed
            repeatedly. The second line ("Apply for roles…") also used "roles" in
            the work-history sense, which WS4 is purging anyway.
          */}
          <div className="mt-7 flex items-center gap-4">
            <PersonIcon />
            <p className="text-[16.5px] leading-relaxed text-ink-2">
              Let&apos;s build an amazing profile so the work finds you!
            </p>
          </div>
        </div>

        {/* E064(a) — the "Providers on Panameer" label is gone; the card speaks
            for itself and the label was competing with the greeting. Now BELOW
            the greeting rather than beside it (E100), so neither is squeezed. */}
        {/* CENTRED and a little larger (E148) — off to the left under a
            full-width heading it left a column of dead space down the right,
            and the spacing read as unbalanced rather than deliberate. */}
        <section className="mx-auto mt-10 w-full max-w-2xl">
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
