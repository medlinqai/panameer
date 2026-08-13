import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { DashboardShot } from "@/components/marketing-home/DashboardShot";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { CapabilityFramework } from "@/components/marketing-home/CapabilityFramework";
import { TalentTeaser } from "@/components/marketing-home/TalentTeaser";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { HomeFooter } from "@/components/marketing-home/HomeFooter";
import "@/components/marketing-home/home.css";

/**
 * THE MARKETING HOME — a faithful port of the approved mockup
 * (brief_home_build_in_app_2026-08-12).
 *
 * SOURCE OF TRUTH:
 *   4. Project Documents/2. Design/05. Home Assets/panameer_home_final_mockup.html
 *
 * The brief says that file IS the spec, so this page reproduces it
 * section-for-section: hero, dashboard product-shot, logo ribbon, methodology
 * ring, capability framework, talent teaser, testimonials, footer. Copy is the
 * mockup's, verbatim — including the sections the brief flags as StratERP-era
 * placeholder. Those are Scott's to rewrite, not mine to improve.
 *
 * ── WHAT THIS REPLACES ───────────────────────────────────────────────────────
 *
 * `/` was the assessment front door (AssessmentHero + Assessment + method +
 * three-ways + beats + closing) from the 2026-08-11/12 briefs. Per this brief
 * the mockup becomes `/`. `/hire-talent` and `/for-providers` are untouched and
 * still shipped, and this page's talent CTAs point at `/hire-talent`.
 *
 * The components that page used are all still in the tree and still rendered by
 * `/hire-talent` — except `AssessmentHero`, `RoadmapPreview` and `FourBeats
 * page="home"`, which now have no caller. Left in place rather than deleted:
 * they are three sessions of approved work, and the brief says to keep the
 * other two pages, not to prune the library behind them.
 *
 * ── PUBLIC HEADER ONLY ───────────────────────────────────────────────────────
 *
 * Rendered directly rather than through `MarketingShell`, deliberately. The
 * shell also renders the three-way audience strip and the shared marketing
 * footer; this page has its own footer from the mockup and no strip in the
 * design. Brief #2 requires the public header on a logged-out page — this is
 * that header, and nothing else.
 *
 * ── STATIC ───────────────────────────────────────────────────────────────────
 *
 * Every section is a server component: no state, no islands, not even a tab
 * switcher. `/` prerendering is a build gate, so nothing here may become
 * interactive without re-checking it.
 */
export const metadata: Metadata = {
  title: "Optimize Your Business with AI — Panameer",
  description:
    "Discover exactly where AI can move the needle in your business — our free " +
    "maturity assessment benchmarks your current capabilities and shows you " +
    "where to focus first.",
};

export default function Home() {
  return (
    /*
      `pm-home` is the scope for the ported stylesheet. Every selector in
      home.css is prefixed with it, so the mockup's generic class names
      (.wrap, .hero, .btn, .stat) cannot leak into the rest of the app.
    */
    <>
      {/*
        THE HEADER SITS OUTSIDE `.pm-home`, and it has to.

        The ported stylesheet carries the mockup's `*{margin:0;padding:0}`
        reset. Scoped to `.pm-home *` it still hits every descendant — including
        a real app component rendered inside it — and it stripped
        MarketingHeader's Tailwind spacing: logo flush to the viewport edge,
        Log In / Sign Up squashed together. Caught by diffing the render against
        the mockup rather than by reading the CSS.

        Keeping the header out of the scope is also the honest structure: it is
        the app's shared header, not part of the ported design.
      */}
      <MarketingHeader />
      <div className="pm-home">
        <HomeHero />
        <DashboardShot />
        {/*
          WS-4 — THE FRAMEWORK MOVED UP, directly under the product-shot. The
          shot IS an AI Maturity Dashboard and this section explains the
          maturity assessment that fills it, so the two now tell "here is the
          dashboard / here is how the assessment behind it works" in one place
          instead of with four sections between them.

          They do NOT read as duplicates, which was the thing to watch: the
          product-shot is one worked example (Ingrao Dental, with figures), and
          the framework is the process — capability domains and the four
          P2P/O2C/R2R/H2R lenses, no client. Different objects, adjacent on
          purpose. Reorder only; neither section is restyled or reworded.
        */}
        <CapabilityFramework />
        <LogoRibbon />
        <MethodologyRing />
        {/*
          WS-3 sits after the method and before the talent (Scott's slot): the
          page has just explained HOW Panameer works, so packaged ERP solutions
          are the first concrete thing you can buy, and the people who build
          them follow.
        */}
        <ErpPackages />
        <TalentTeaser />
        <Testimonials />
        <HomeFooter />
      </div>
    </>
  );
}
