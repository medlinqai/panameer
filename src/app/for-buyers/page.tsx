import type { Metadata } from "next";
import { Hero } from "@/components/marketing/Hero";
import { WhyPanameer } from "@/components/marketing/WhyPanameer";
import { Packages } from "@/components/marketing/Packages";
import { Punchout } from "@/components/marketing/Punchout";
import { Pricing } from "@/components/marketing/Pricing";
import { MarketingShell } from "@/components/marketing/MarketingShell";

/**
 * `/for-buyers` — the hiring side of the fork (WS-D).
 *
 * Reads top to bottom as one argument: here is what you can hire (hero), here
 * is the whole engagement in four steps (Why Panameer, buyer journey), here is
 * the way to buy it with the risk priced in (Packages), here is how it reaches
 * your ERP (Punchout), here is what it costs (Pricing).
 *
 * EVERY SECTION IS THE EXISTING COMPONENT. Nothing was rewritten to live here —
 * Packages, Punchout and Pricing moved off `/` unchanged, and Why Panameer took
 * an `audience` prop. That is the point of the fork: the sections were always
 * single-audience, and the old page was the thing making them share a scroll.
 *
 * NO RIBBON. Community Credits are the provider-side economy; a buyer earning
 * Credits for "building your profile" is a sentence about somebody else.
 */
export const metadata: Metadata = {
  title: "Hire Enterprise Systems and AI Experts — Panameer",
  description:
    "Hire vetted Enterprise Systems and AI experts, buy fixed-price packages, " +
    "or connect your ERP and order services without leaving your system of record.",
};

export default function ForBuyersPage() {
  return (
    <MarketingShell audience="buyer">
      <Hero audience="buyer" />
      <WhyPanameer audience="buyer" />
      <Packages />
      <Punchout />
      <Pricing />
    </MarketingShell>
  );
}
