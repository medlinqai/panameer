import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { WHY_HERO } from "@/lib/brand";
import "@/components/marketing-home/home.css";

export const metadata: Metadata = {
  title: "Why Panameer — the method, and the people who ran it",
  description:
    "A firm's methodology and a managed engagement, delivered by a distributed " +
    "network of senior experts instead of a salaried pyramid.",
};

export default function WhyPanameerPage() {
  return (
    <MarketingShell>
      <MarketingHero
        audience="buyer"
        kicker={WHY_HERO.kicker}
        headline={WHY_HERO.headline}
      />
      {/* The scope for the ported stylesheet, around the payload only. */}
      <div className="pm-home">
        <MethodologyRing />
        <Testimonials />
      </div>
    </MarketingShell>
  );
}
