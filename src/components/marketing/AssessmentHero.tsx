import Link from "next/link";
import { HOME_HERO, BRAND_BADGE_SHORT } from "@/lib/brand";
import { ASSESSMENT_AREAS } from "@/lib/assessment-data";
import { MaturityDashboard } from "@/components/marketing/MaturityDashboard";

/**
 * THE HOME HERO — the assessment front door (brief_public_pages_ia WS-1).
 *
 * ── WHAT LEFT, AND WHY ───────────────────────────────────────────────────────
 *
 * THE TALENT SEARCH IS GONE FROM HERE. It was the first thing on the page, and
 * it asked a question the home's audience cannot answer: somebody who does not
 * yet know where their operations rank has no name to type into "search
 * experts". It moved to Hire Talent, where the visitor arrives already knowing
 * they want to hire. The home's ask is smaller and earlier — find out where you
 * stand — and the search would have competed with it from the strongest slot on
 * the page.
 *
 * THE BRAND LOCKUP IS NO LONGER THE H1. "Learn. Connect. Create. Settle." was
 * the headline on every marketing page; it is a beautiful line and it says
 * nothing about the reader. It stays as the through-line lower down (see
 * `PAGE_BEATS`) and the H1 is now the value: see where your business really
 * stands. Flagged as a design call for Scott in the brief, taken this way.
 *
 * THE RIGHT HALF WAS EMPTY. The dashboard fills it with the actual output of
 * the thing being offered — the strongest argument for taking an assessment is
 * showing what it gives you.
 *
 * ── HONESTY ──────────────────────────────────────────────────────────────────
 *
 * Nothing here measures anything yet. Three things carry that, and none of them
 * is fine print: the dashboard labels itself "Sample Read" and captions its own
 * figures as illustrative (it does that on its own — see `MaturityDashboard`),
 * the CTA sub-label says "Sign in to be first in line" rather than promising a
 * score, and `HOME_HERO.frameworkNote` says in the hero that the framework is
 * what you will be scored against and the read shown is a sample.
 *
 * A server component. No state, no client JS — which is what keeps `/` static.
 */
export function AssessmentHero() {
  /*
    Procure-to-Pay is the sample shown. It is the first area in the catalog and
    the one most buyers recognise; the tabbed section further down the page is
    where all four are browsable, so the hero does not need a switcher — and a
    switcher here would be a client island in the one place the page cannot
    afford one without losing static rendering.
  */
  const sample = ASSESSMENT_AREAS[0];

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(1100px_500px_at_82%_-10%,rgba(215,44,214,0.42),transparent_60%),linear-gradient(150deg,#0d1230_0%,#191a44_55%,#3a1c53_100%)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(700px_400px_at_75%_30%,#000,transparent_75%)]"
      />

      <div className="relative mx-auto grid max-w-[1120px] items-center gap-10 px-7 pb-[62px] pt-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="mb-[22px] inline-block rounded-full bg-magenta px-3.5 py-1.5 font-display text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white">
            {HOME_HERO.kicker}
          </span>

          <h1 className="text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
            {HOME_HERO.headline}
          </h1>

          <p className="mt-5 max-w-[560px] text-balance text-[17px] text-[#e9e6f5] sm:text-[19px]">
            {HOME_HERO.subhead}
          </p>

          {/*
            The funnel entry, and the only CTA in this hero. It routes to the
            real sign-in with a callback to the assessment section, so somebody
            who signs in lands back on what they were reading.
          */}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/#assessment")}`}
            className="mt-8 inline-block rounded-[14px] bg-magenta px-[26px] py-3.5 text-left font-display text-[16px] font-bold text-white shadow-[0_12px_28px_rgba(215,44,214,0.28)] transition-colors hover:bg-magenta-dark"
          >
            {HOME_HERO.cta} <span aria-hidden>→</span>
            <span className="mt-0.5 block font-body text-[11.5px] font-normal opacity-90">
              {HOME_HERO.ctaSub}
            </span>
          </Link>

          <p className="mt-4 max-w-[520px] text-[13.5px] leading-relaxed text-[#cdc9e6]">
            {HOME_HERO.frameworkNote}
          </p>

          {/*
            The lockup survives as a quiet through-line rather than the
            headline — it is the brand's line, not the reader's reason.
          */}
          <p className="mt-7 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a7a3c6]">
            {BRAND_BADGE_SHORT}
          </p>
        </div>

        {/* The output of the thing being offered, reused verbatim. */}
        <div className="lg:pl-2">
          <MaturityDashboard area={sample} compact />
        </div>
      </div>
    </div>
  );
}
