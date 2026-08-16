import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { DashboardShot } from "@/components/marketing-home/DashboardShot";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
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
 * the mockup becomes `/`. `/hire-talent` and `/find-work` are untouched and
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
 * ── STATIC, WHICH IS NOT THE SAME AS SERVER-ONLY ─────────────────────────────
 *
 * This once said every section was a server component. That stopped being true
 * with the capability explorer and the two lightbox sections, and the corrected
 * rule is the one that actually matters: **`/` must still prerender as ○**, and
 * the build output is the gate.
 *
 * A Client Component does not make a route dynamic — only reading request-time
 * data does (cookies, headers, searchParams, an uncached fetch). The
 * interactive sections here are client islands with local state and no data
 * access, so `/` is still prerendered whole. Anything added must keep it that
 * way; check the build's route table, do not assume.
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
          THE FRAMEWORK STILL FOLLOWS THE PRODUCT-SHOT, with only the client
          ribbon between them now (WS-2). The shot IS an AI Maturity Dashboard
          and this section explains the assessment that fills it, so they stay
          adjacent — a slim dark band between them does not break that reading,
          it paces it.

          They do NOT read as duplicates, which was the thing to watch: the
          product-shot is one worked example (Ingrao Dental, with figures), and
          the framework is the process — capability domains and the four
          P2P/O2C/R2R/H2R lenses, no client. Different objects, adjacent on
          purpose. Reorder only; neither section is restyled or reworded.
        */}
        {/*
          WS-2 — THE RIBBON SITS RIGHT UNDER THE PRODUCT SHOT. It was below the
          framework. Moving it up puts the client wordmarks immediately after
          the first real proof on the page, which is where a visitor is asking
          "who else uses this"; it also breaks up two long light sections that
          previously ran together. Stays dark.
        */}
        <LogoRibbon />
        <CapabilityFramework />
        <MethodologyRing />
        {/*
          WS-3 sits after the method and before the talent (Scott's slot): the
          page has just explained HOW Panameer works, so packaged ERP solutions
          are the first concrete thing you can buy, and the people who build
          them follow.
        */}
        <ErpPackages />
        {/*
          THE ORDER IS THE ARGUMENT (brief_home_erp_integration WS-2). The
          agents section above says WHAT plugs into your ERP; this says HOW it
          connects; the talent section below says who builds it. Integration
          before talent, because "we move the native data both ways" is what
          makes the people worth hiring — the reverse order reads as a staffing
          pitch with an integration footnote.

          ⚠ `erpx-band` IS THE CHROME, AND IT IS PASSED IN ON PURPOSE. The
          component owns no background or padding of its own so it can be
          dropped onto the Enterprise page — its second home, per Scott
          2026-08-15 — without arriving wearing this page's spacing.
        */}
        <ErpIntegration className="erpx-band" />
        <TalentTeaser />
        <Testimonials />
        <HomeFooter />
      </div>
    </>
  );
}
