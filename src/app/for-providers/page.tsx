import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { TwoPains } from "@/components/marketing/sections/TwoPains";
import { OmniChannel } from "@/components/marketing/sections/OmniChannel";
import { VideoSequence } from "@/components/marketing/VideoSequence";
import { GoDirectBionic } from "@/components/marketing/sections/GoDirectBionic";
import { AiStrip } from "@/components/marketing/sections/AiStrip";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";

/**
 * THE SELLER PAGE (brief_home_rebuild_08_09 WS-C).
 *
 * A full mirror of the buyer page — same shell, same hero component, same
 * four-beat sequence, same AI strip and closing band — with the argument turned
 * around. Where the buyer is shown three ways to buy and told the big firm
 * marks the expert up, the seller is shown the two reasons going independent is
 * hard and told they ARE the marked-up expert.
 *
 * Order: pain first (two pains), then the answer to the second one
 * (monetization), then how the platform works from their side (sequence), then
 * the pitch (go direct + bionic), then AI, then the ask.
 *
 * NO ASSESSMENT SECTION. That framework is a buyer diagnostic — capability
 * domains and AI maturity are things an ORGANISATION has — and neither the
 * mockup nor the brief puts it here.
 *
 * Every section is a server component, so this route carries no client JS at
 * all and prerenders static.
 */
export const metadata: Metadata = {
  title: "Sell Your Expertise Direct — Panameer",
  description:
    "Find consistent work and break the hourly ceiling. Sell consultations, " +
    "courses, packages and engagements under your own name — contracts, " +
    "compliance and settlement carried by the platform.",
};

export default function SellerPage() {
  return (
    <MarketingShell>
      <MarketingHero audience="provider" />
      <TwoPains />
      <OmniChannel />
      <VideoSequence audience="provider" tone="soft" />
      <GoDirectBionic />
      <AiStrip audience="provider" />
      <ClosingCta audience="provider" />
    </MarketingShell>
  );
}
