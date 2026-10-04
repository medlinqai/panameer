import type { Metadata } from "next";
import {
  CAPABILITY_EXPLAINED_LABEL,
  OPTIMIZE_CTA_LABEL,
} from "@/lib/spine-steps";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { HowItWorks } from "@/components/marketing-home/HowItWorks";
import { OptimizeSteps } from "@/components/marketing-home/OptimizeSteps";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "Optimize Your Business with AI — Panameer",
  description:
    "See where AI moves the needle in your business: a free maturity " +
    "assessment, an optimization dashboard, and a 1-year AI Roadmap built " +
    "with an expert.",
};

export default function OptimizePage() {
  return (
    <>
      {}
      <MarketingHeader />
      <div className="pm-home">
        {}
        {}
        {}
        <HomeHero
          ctaLabel={OPTIMIZE_CTA_LABEL}
          secondaryCtaLabel={CAPABILITY_EXPLAINED_LABEL}
          secondaryCtaHref="/capability-domains"
          description={
            <>
              Click the &ldquo;{OPTIMIZE_CTA_LABEL}&rdquo; button, see where you
              stand, and build your 12-month AI roadmap with an expert.
            </>
          }
        />
        {}
        <HowItWorks showStrip={false} />
        <OptimizeSteps />
      </div>
      {}
      <MarketingFooter />
    </>
  );
}
