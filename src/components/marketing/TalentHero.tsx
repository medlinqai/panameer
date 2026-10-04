import { HeroBox } from "@/components/marketing/HeroBox";
import {
  HERO_CARD,
  HERO_SCRIM,
  HERO_BUTTON,
  HERO_BRIDGE_TEXT,
  HERO_BRIDGE_CLASS,
  HERO_DESC_CLASS,
} from "@/components/marketing/hero-treatment";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { talentHeroStats } from "@/lib/talent-stats";
import { TALENT_CTA_LABEL } from "@/lib/talent-steps";

export async function TalentHero() {
  const stats = await talentHeroStats();
  return (
    <HeroBox cardClassName={HERO_CARD}>
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {}
        <HeroVideoBackdrop
          src="/connect-hero.mp4"
          poster="/posters/connect.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          {}
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Sell More than Just Your Resume
                </h1>

                {}
                <a
                  href="/join"
                  className={HERO_BUTTON}
                >
                  {}
                  {TALENT_CTA_LABEL}
                </a>

                {}
              </>
            }
            right={
              <>
                {}
                {}
                {}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{TALENT_CTA_LABEL}&rdquo; button &amp; build your profile with AI,
                  sell your time. Then create Service Products to resell your
                  previous work-product.
                </p>

                {}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>

                {}
                <dl className="mt-[26px] grid grid-cols-3 gap-[14px]">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-[14px] border border-white/[0.13] bg-white/[0.06] px-4 py-[18px]"
                    >
                      <dd className="font-display text-[34px] font-bold leading-[34px] text-white">
                        {s.value}
                      </dd>
                      <dt className="mt-2 text-[12.5px] font-normal leading-[16.25px] text-[#cec7db]">
                        {s.label}
                      </dt>
                    </div>
                  ))}
                </dl>
              </>
            }
          />

          {}

          {}
        </div>
      </section>
    </HeroBox>
  );
}
