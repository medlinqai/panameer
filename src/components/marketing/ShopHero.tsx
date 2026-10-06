import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import {
  SERVICE_PRODUCTS_EXPLAINED_LABEL,
  SHOP_CTA_LABEL,
} from "@/lib/shop-steps";
import {
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_CARD,
  HERO_SCRIM,
  HERO_BRIDGE_TEXT,
  HERO_BRIDGE_CLASS,
  HERO_DESC_CLASS,
} from "@/components/marketing/hero-treatment";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { shopHeroStats } from "@/lib/shop-stats";

export async function ShopHero() {
  const stats = await shopHeroStats();
  return (
    <HeroBox cardClassName={HERO_CARD}>
      <section className="relative px-6 pb-[48px] pt-[44px] min-[901px]:pb-[72px] min-[901px]:pt-[64px]">
        {}
        <HeroVideoBackdrop
          src="/get-paid-hero.mp4"
          poster="/posters/settle.svg"
          videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
          scrimClassName={HERO_SCRIM}
        />
        <div className="relative z-[2] mx-auto max-w-[1120px]">
          <HeroTwoUp
            rowClassName="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14"
            left={
              <>
                {}
                <h1 className="font-display text-[34px] font-bold leading-[1.08] tracking-[-0.8px] min-[901px]:text-[46px] min-[901px]:tracking-[-1px]">
                  Deploy Faster. With Less Risk.
                </h1>

                {}
                {}
                {}
                <button
                  type="button"
                  aria-disabled="true"
                  className={`${HERO_BUTTON} inline-flex cursor-default items-center gap-2.5 hover:bg-magenta`}
                >
                  {SHOP_CTA_LABEL}
                  <span className="rounded-full bg-white/20 px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                    Soon
                  </span>
                </button>
                {/* THE SECOND, OUTLINED CONTROL */}
                <div className="-mt-4">
                  <Link href="/pre-defined-services" className={HERO_BUTTON_OUTLINE}>
                    {SERVICE_PRODUCTS_EXPLAINED_LABEL}
                  </Link>
                </div>
              </>
            }
            right={
              <>
                {/* VERBATIM SCOTT, WITH TWO RECORDED CORRECTIONS */}
                {/* SCOTT-APPROVED DESCRIPTION amendment §3) */}
                <p className={HERO_DESC_CLASS}>
                  Click the &ldquo;{SHOP_CTA_LABEL}&rdquo; button and buy fixed-scope &amp;
                  fixed-price items built by our experts - agents, demos,
                  retainers, and more.
                </p>
                {/* THE BRIDGE LINE (`WS4`) */}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>

                {/* THE THREE TILES, AND THEY ARE THIS PAGE'S OWN */}
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
        </div>
      </section>
    </HeroBox>
  );
}
