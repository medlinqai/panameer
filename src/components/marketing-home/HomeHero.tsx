import type { ReactNode } from "react";
import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import {
  HERO_BRIDGE_CLASS,
  HERO_BRIDGE_TEXT,
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_CARD,
  HERO_DESC_CLASS,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";
import { ProofStats } from "@/components/marketing/ProofStats";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";

export function HomeHero({
  ctaLabel = "Take Our Free Assessment",
  headline = "Optimize Your Business with AI",
  description = (
    <>
      See where you stand and where AI can move the needle in your business. Then
      build your 12-month roadmap with an expert &mdash; all for&nbsp;free.
    </>
  ),
  secondaryCtaLabel,
  secondaryCtaHref,
}: {
  ctaLabel?: string;
  headline?: ReactNode;
  description?: ReactNode;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
} = {}) {
  return (
    <section className="hero">
      {}
      {}
      <HeroBox cardClassName={`hero-card ${HERO_CARD}`}>
        <div className="hero-card-inner">
          <HeroVideoBackdrop
            src="/consultation.mp4"
            videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
            scrimClassName={HERO_SCRIM}
          />
          {/* The grid survives the redesign, inverted: white hairlines at 14% */}
          <div aria-hidden className="hero-grain" />

          {/* THE ROW IS `HeroTwoUp` NOW, AND THE CLASS NAMES ARE UNCHANGED */}
          <HeroTwoUp
            rowClassName="wrap hero-row"
            leftClassName="hero-left"
            rightClassName="hero-right"
            left={
              <>
                {/* BOTH STRINGS ARE THE OWNER'S AND THEY ARE SETTLED. */}
                <h1>{headline}</h1>
                {/* THE BUTTON GOES TO /assess. It was `#` — an honest stub while
                  the assessment did not exist. No `›` affectation. */}
                {/* THE STANDARD BUTTON (`HERO_BUTTON`), NOT `.hero-cta`. Scott named */}
                <Link href="/assess" className={HERO_BUTTON}>
                  {ctaLabel}
                </Link>
                {/* THE SECOND, OUTLINED CONTROL */}
                {secondaryCtaLabel && secondaryCtaHref ? (
                  <div className="-mt-4">
                    <Link href={secondaryCtaHref} className={HERO_BUTTON_OUTLINE}>
                      {secondaryCtaLabel}
                    </Link>
                  </div>
                ) : null}
              </>
            }
            right={
              <>
                {/* THE HERO NO LONGER CARRIES THE TWO-OUTPUTS SPLIT (E160), AND THE */}
                {/* the softer one. `OptimizationDashboardShot` already ships "Your Org */}
                {/* Scott: "That last wrap and giving the word 'free' its own line is not */}
                <p className={HERO_DESC_CLASS}>{description}</p>
                {/* A DISTINCT BEAT, NOT A SENTENCE ON THE LEDE. It is the bridge into */}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>
                {/* WS-9 — one shared component; /assess step 0 renders the same source. */}
                <ProofStats />
              </>
            }
          />
        </div>
      </HeroBox>
    </section>
  );
}
