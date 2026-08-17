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
import { HowItWorks } from "@/components/marketing-home/HowItWorks";
import { StepDetail } from "@/components/marketing-home/StepDetail";
import { QuestionShot } from "@/components/marketing-home/steps/QuestionShot";
import { LadderShot } from "@/components/marketing-home/steps/LadderShot";
import { HandoffShot } from "@/components/marketing-home/steps/HandoffShot";
import { ReviewShot } from "@/components/marketing-home/steps/ReviewShot";
import { ConsultShot } from "@/components/marketing-home/steps/ConsultShot";
import { GetTheTalent } from "@/components/marketing-home/GetTheTalent";
import { ProjectTracker } from "@/components/marketing-home/ProjectTracker";
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

        {/*
          ⚠ THE STRIP COMES BEFORE THE PRODUCT SHOT (brief_hiw_video_treatment §1).

          The hero CTA says "take the free assessment", so the next thing on the
          page is what happens when you do. It used to show the dashboard first
          — the artefact, before any explanation of how to get one. It also puts
          card 4, "You Log In and Review", directly above the dashboard it is
          talking about. Do not revert this to put the shot back on top.
        */}
        <HowItWorks />
        <DashboardShot />

        {/*
          ── THE ASSESSMENT SPINE (brief_home_assessment_spine, 2026-08-16) ────

          Home stops being a marketplace brochure. It pitches the
          process-specific assessment, explains it in five cards, expands each
          card into its own section with a graphic, then hands the visitor the
          talent and the tracker.

          ⚠ ADDITIVE AND REORDER ONLY. Every section that used to sit here is
          still on the page, in its original relative order, below the tracker.
          Several of them cost multiple briefs to build — the capability
          explorer, the two lightbox sections, the flow diagrams — and retiring
          or relocating any of them is a separate owner decision, not a
          consequence of this one. Nothing was deleted.
        */}
        <StepDetail
          n={1}
          title="Step 1 · Take the Assessment"
          lead={
            <>
              Pick the process you care about and answer for it &mdash; one question a
              screen, no forms, no preparation. Most people are done in about eight
              minutes, and you can stop and send the rest to whoever owns it.
            </>
          }
        >
          <QuestionShot />
        </StepDetail>

        <StepDetail
          n={2}
          shade
          title="Step 2 · AI Scores Every Domain"
          lead={
            <>
              Every capability domain inside that process is placed on the same
              maturity ladder, so the gaps are comparable to each other and not
              just to a benchmark. <strong>Nothing is guessed</strong>{" "}
              &mdash; a domain
              you skip is excluded from the score rather than counted as the worst
              rung.
            </>
          }
        >
          <LadderShot />
        </StepDetail>

        <StepDetail
          n={3}
          title="Step 3 · We Build Your Dashboard"
          lead={
            <>
              The scores become an analytics dashboard sized in your own dollars:
              what the opportunity is worth, what it costs, and how much of it the
              tax code can fund. Then we send you the link.
            </>
          }
        >
          <HandoffShot />
        </StepDetail>

        <StepDetail
          n={4}
          shade
          wide
          title="Step 4 · You Log In and Review"
          lead={
            <>
              <strong>The link signs you in</strong>{" "}
              &mdash; no password to set, nothing
              to install. Your scores and your opportunities, ranked by the dollars
              running through each area rather than by how far behind it is. It is
              yours to keep and yours to forward.
            </>
          }
        >
          <ReviewShot />
        </StepDetail>

        <StepDetail
          n={5}
          title="Step 5 · Free Consultation"
          lead={
            <>
              A coordinator who has already read your scorecard walks you through how
              to deploy each opportunity and what the net effect on the business
              would be.{" "}
              <strong>
                It is not a pitch, it is not a discovery call, and it is not a
                prerequisite for anything
              </strong>{" "}
              &mdash; the dashboard is yours whether you book it or not.
            </>
          }
        >
          <ConsultShot />
        </StepDetail>

        <GetTheTalent />
        <ProjectTracker />

        {/*
          ── EVERYTHING BELOW THIS LINE IS THE PRE-SPINE PAGE, UNCHANGED ──────
          Displaced, not deleted. Relative order preserved exactly.
        */}
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

          ⚠ THE SPINE NOW SITS BETWEEN THEM. The adjacency above was a 2026-08-14
          decision and it is superseded rather than forgotten: the product shot
          is still the first proof, but what follows it is now the explanation of
          how you get one, which is a stronger read than the framework was.
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
