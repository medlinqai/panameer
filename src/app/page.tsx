import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
import { CapabilityFramework } from "@/components/marketing-home/CapabilityFramework";
import { TalentTeaser } from "@/components/marketing-home/TalentTeaser";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { HomeFooter } from "@/components/marketing-home/HomeFooter";
import { HowItWorks } from "@/components/marketing-home/HowItWorks";
import { ProcessPicker } from "@/components/marketing-home/ProcessPicker";
import { SpineSteps } from "@/components/marketing-home/SpineSteps";
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
        {/*
          ── SECTION 3: THE PROCESS PICKER (E126) ──────────────────────────────

          Placed directly after the strip because the walk matrix numbers it
          "Home section 3" against Scott's own numbering — 1 hero, 2 the strip,
          3 this. The brief said "between HowItWorks and the existing #step-1" and
          positioned it ahead of the dashboard shot that used to sit in that gap, so
          the reader picked a process before being shown the artefact a process
          produces. That shot is gone (E159/E171) and the spine's own Step 4 shows the
          dashboard now, but the ordering argument is unchanged: process first.

          Data-driven: every card comes from `lib/processes.ts`. A fifth process
          is an entry in that array and nothing here changes.
        */}
        <ProcessPicker />
        {/*
          ── SPINE STEPS 2-5 (brief_home_spine_copy parts C-F) ─────────────────

          Directly after Step 1, so the five steps read 1-2-3-4-5 in one run
          before anything else. Rendered from `lib/spine-steps.ts`; a sixth step
          is a data edit.

          ⚠ THE DUPLICATE STEP NUMBERING IS RESOLVED (E164). This note used to say
          the page numbered its steps twice — the spine here, and five `#step-1..5`
          StepDetail sections further down — and that it stayed because "nothing
          comes off Home" was the standing rule and it was Scott's call. He made it:
          "I think these sections can be deleted. Any concerns? I see these as
          duplicates." They are gone.

          ⚠ AND SO IS `DashboardShot` (E159/E171). Scott: "please remove the second
          image of the dashboard...it is a duplicate." It sat immediately below Step 5
          showing the same optimization dashboard the spine's Step 4 shows — and it was
          the STALE copy, still carrying seven strings corrected elsewhere this week:
          the old heading, "Thursday, 30 September 2022", the "1 Sep 22 – 30 Sep 22"
          pill and its `▾` glyph, "Your Org Versus Peers", "best-practice ERP peer
          median", a "Peers" label, and a second TDWCA row. Fixing seven strings in a
          component whose only job was to duplicate another one would have been wasted
          work; removing it closed all seven at once.

          ⚠ `DashboardShot.tsx` STAYS ON DISK, UNIMPORTED — same rule as E164. It is the
          only place some of that chrome exists and the stretch below the spine is still
          Scott's to repurpose. Its nine `.tab` / `.soon` rules in home.css are now dead
          too and are deliberately left for that pass.
        */}
        <SpineSteps />

        {/*
          ── THE ASSESSMENT SPINE (brief_home_assessment_spine, 2026-08-16) ────

          Home stops being a marketplace brochure. It pitches the
          process-specific assessment, explains it in five cards, then hands the
          visitor the talent and the tracker.

          ⚠ THE FIVE `StepDetail` SECTIONS THAT USED TO SIT HERE ARE GONE (E164),
          AND THAT OVERRODE THE RULE THIS COMMENT USED TO STATE. It read: "ADDITIVE
          AND REORDER ONLY. Every section that used to sit here is still on the page,
          in its original relative order, below the tracker… retiring or relocating
          any of them is a separate owner decision, not a consequence of this one.
          Nothing was deleted." Scott made that separate decision: "I think these
          sections can be deleted. Any concerns? I see these as duplicates." The
          spine above tells steps 1-5 once; these told them a second time.

          ⚠ THE RULE STILL HOLDS FOR EVERYTHING ELSE. Every other section that was
          moved below the tracker is still there, in its original relative order —
          the capability explorer, the two lightbox sections, the flow diagrams. Each
          cost multiple briefs. This deletion was named and scoped; it is not a
          licence to prune.

          ⚠ THE `HowItWorks` CARDS NOW POINT AT THE SPINE — see the note on their
          `href`. They were the only thing referencing `#step-1..5`.

          ⚠ THE COMPONENT FILES ARE STILL ON DISK, UNIMPORTED, ON PURPOSE. Two of
          them are not duplicates of anything: `steps/LadderShot.tsx` (the per-domain
          scorecard across the whole ladder) and `steps/ReviewShot.tsx` ("Here's
          what's on the table", the 0% savings ring, "Your Highest-Impact Moves") have
          no spine equivalent, and where that content goes is an open question. The
          other three are superseded — QuestionShot by `AssessmentWizardShot`,
          HandoffShot by the Step 4 email (E163), ConsultShot by the Step 5 booking
          card (E165) — and can be deleted in a later pass. Keeping the files makes
          this reversible and loses nothing.
        */}

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
