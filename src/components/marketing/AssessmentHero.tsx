import Link from "next/link";
import { HOME_HERO, BRAND_BADGE_SHORT } from "@/lib/brand";
import { ASSESSMENT_AREAS } from "@/lib/assessment-data";
import { MaturityDashboard } from "@/components/marketing/MaturityDashboard";

export function AssessmentHero() {
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

          {}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/#assessment")}`}
            className="mt-8 inline-block bg-magenta px-[26px] py-3.5 text-left font-display text-[16px] font-bold text-white shadow-[0_12px_28px_rgba(215,44,214,0.28)] transition-colors hover:bg-magenta-dark"
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
