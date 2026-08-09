import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ThreeWays } from "@/components/marketing/sections/ThreeWays";
import { VideoSequence } from "@/components/marketing/VideoSequence";
import { ErpPunchout } from "@/components/marketing/sections/ErpPunchout";
import { ValueStack } from "@/components/marketing/sections/ValueStack";
import { AiStrip } from "@/components/marketing/sections/AiStrip";
import { Assessment } from "@/components/marketing/sections/Assessment";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";

/**
 * THE BUYER PAGE — and `/` is it (brief_home_rebuild_08_09 WS-B).
 *
 * Only reachable on the marketing hosts (panameer.com / www); every other host
 * redirects `/` into the app. See `src/proxy.ts`.
 *
 * THE NEUTRAL LANDING IS GONE. `/` spent three briefs as an agnostic page whose
 * job was to ask which side you were on and hand you off — a hero, a primer
 * carousel, and a fork. The rebuild makes a different bet: buyers are the
 * default audience, so the root sells to them directly and the seller page is
 * one click away in the hero toggle. A marketplace that opens by asking a
 * question spends its best screen not answering one.
 *
 * Section order is the mockup's, and the order is an argument: what you have
 * today (three ways) → how this works (the four beats) → how it reaches your
 * ERP (punchout) → what procurement gets (value stack) → what is AI (strip) →
 * where you stand (assessment) → go (closing).
 *
 * EVERY SECTION IS A SERVER COMPONENT except the assessment's tab switcher,
 * which is why this route still prerenders static.
 */
export const metadata: Metadata = {
  title: "Hire Enterprise Systems and AI Experts — Panameer",
  description:
    "On-demand access to pre-vetted Oracle and Enterprise Systems experts. " +
    "Go direct — one contract, one monthly payment, no employment risk — and " +
    "punch out for services straight from your ERP.",
};

export default function BuyerHome() {
  return (
    <MarketingShell audience="buyer">
      <MarketingHero audience="buyer" />
      <ThreeWays />
      <VideoSequence audience="buyer" />
      <ErpPunchout />
      <ValueStack />
      <AiStrip audience="buyer" />
      <Assessment />
      <ClosingCta audience="buyer" />
    </MarketingShell>
  );
}
