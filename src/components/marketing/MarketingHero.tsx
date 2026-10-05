import Link from "next/link";
import { HERO_CARD, HERO_SCRIM } from "@/components/marketing/hero-treatment";
import { HeroBox } from "@/components/marketing/HeroBox";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HERO_COPY } from "@/lib/brand";
import { BRAND_BADGE_SHORT } from "@/lib/brand";

export function MarketingHero({
  audience,
  headline,
  kicker,
  videoSrc,
}: {
  audience: "buyer" | "provider";
  headline?: string;
  kicker?: string;
  videoSrc?: string;
}) {
  const copy = HERO_COPY[audience];
  // /explore reads `mode`, and treats anything that is not "work" as hiring.
  const mode = audience === "buyer" ? "hire" : "work";

  return (
    <HeroBox
      cardClassName={
        (videoSrc ? "isolate " : "") +
        HERO_CARD
      }
    >
      {}
      {videoSrc ? (
        <HeroVideoBackdrop
          src={videoSrc}
          poster="/posters/create.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
      ) : null}
      {}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(700px_400px_at_75%_30%,#000,transparent_75%)]"
      />

      <div className="relative mx-auto max-w-[1120px] px-7 pb-[62px] pt-14">
        <span className="mb-[22px] inline-block rounded-full bg-magenta px-3.5 py-1.5 font-display text-[12.5px] font-semibold uppercase tracking-[0.18em] text-white">
          {kicker ?? copy.kicker}
        </span>

        {}
        {headline ? (
          <h1 className="max-w-[720px] text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.01em] sm:text-[52px]">
            {headline}
          </h1>
        ) : (
          <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.01em] sm:text-[60px]">
            {BRAND_BADGE_SHORT.split(". ").slice(0, 2).join(". ") + "."}
            <br className="hidden sm:block" />{" "}
            {BRAND_BADGE_SHORT.split(". ").slice(2).join(". ")}
          </h1>
        )}

        <p className="mt-5 max-w-[600px] text-balance text-[17px] text-[#e9e6f5] sm:text-[19px]">
          {copy.subhead}
        </p>

        {}

        {}

        {/* ── Search: a real GET form, no JavaScript ── */}
        <form
          action="/explore"
          method="get"
          className="mt-8 flex w-full max-w-[620px] rounded-full bg-white py-[7px] pl-5 pr-[7px] shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:pl-[22px]"
        >
          <input type="hidden" name="mode" value={mode} />
          <input
            name="q"
            aria-label={copy.searchPlaceholder}
            placeholder={copy.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-[#9aa0b8]"
          />
          <button
            type="submit"
            className="shrink-0 whitespace-nowrap bg-magenta px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-magenta-dark sm:px-6"
          >
            {copy.searchCta}
          </button>
        </form>

        <div className="mt-[18px] flex max-w-[720px] flex-wrap gap-2.5">
          {copy.chips.map((chip, i) => (
            <Link
              key={chip}
              href={`/explore?mode=${mode}&q=${encodeURIComponent(chip)}`}
              className={
                "px-4 py-2 text-[13.5px] transition-colors " +
                // The first chip is the accented one in both mockups.
                (i === 0
                  ? "border border-magenta bg-magenta/[0.16] text-white"
                  : "border border-white/[0.22] bg-white/[0.04] text-[#e4e1f2] hover:border-white/60")
              }
            >
              {chip}
            </Link>
          ))}
        </div>

        {/*
          ⚠ MICROCOPY, NOT A CONTROL. Both AI hints describe what the sign-up
          flow does with a document or a résumé — the résumé parser is real and
          shipped — but there is no drop target in this hero, so it is a
          sentence and never a button. Dressing it as an upload would be the
          page implying something it cannot do.
        */}
        <p className="mt-3.5 flex items-center gap-[7px] text-[13.5px] text-[#cdc9e6]">
          <span aria-hidden className="text-magenta">
            ✦
          </span>
          {copy.aiHint}
        </p>

        {/* The lockup, kept as the through-line when a page leads with value. */}
        {headline && (
          <p className="mt-7 font-display text-[13px] font-semibold uppercase tracking-[0.2em] text-[#a7a3c6]">
            {BRAND_BADGE_SHORT}
          </p>
        )}
      </div>
    </HeroBox>
  );
}
