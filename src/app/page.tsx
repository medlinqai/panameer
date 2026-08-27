import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { OneWayTwoWay } from "@/components/marketing-home/OneWayTwoWay";
import { HomeSections } from "@/components/marketing-home/HomeSections";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { CapabilityFramework } from "@/components/marketing-home/CapabilityFramework";
import { FourAudiences } from "@/components/marketing-home/FourAudiences";
import { TalentTeaser } from "@/components/marketing-home/TalentTeaser";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { ValueStack } from "@/components/marketing/sections/ValueStack";
import { VideoSequence } from "@/components/marketing/VideoSequence";
import { AppShots } from "@/components/marketing/sections/AppShots";
import { ThreeWays } from "@/components/marketing/sections/ThreeWays";
import { AiMatch } from "@/components/marketing/sections/AiMatch";
import { TwoPains } from "@/components/marketing/sections/TwoPains";
import { OmniChannel } from "@/components/marketing/sections/OmniChannel";
import { GoDirectBionic } from "@/components/marketing/sections/GoDirectBionic";
import { ProfileViz } from "@/components/marketing/sections/ProfileViz";
import { FourBeats } from "@/components/marketing/sections/FourBeats";
import { AiStrip } from "@/components/marketing/sections/AiStrip";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";
import { ErpPunchout } from "@/components/marketing/sections/ErpPunchout";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GetTheTalent } from "@/components/marketing-home/GetTheTalent";
import { WorkTracker } from "@/components/marketing-home/WorkTracker";
/* ⚠ `HowItWorks`, `ProcessPicker` AND `SpineSteps` ARE DELIBERATELY NOT IMPORTED
   HERE ANY MORE (`P1-J0-E298`) — they render on `/optimize` instead. All three
   files are still on disk and still imported THERE; deleting one breaks that
   page. See the note where they used to render. */
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
        {/*
          ── ⚠⚠ `<HomeHero />` REMOVED FROM `/` (`P1-J0-E337`, 2026-08-27) ────────

          Scott: *"Let's start by removing the first (duplicate) section for
          optimization."* `/` printed `Optimize Your Business with AI` TWICE — once
          here and once as `HomeSections`' first section. This one went.

          ⚠⚠ `HomeHero` IS NOT DELETED AND `/optimize` IS UNTOUCHED. The component has
          a SECOND call site at `app/optimize/page.tsx`, which still renders it with
          `ctaLabel={OPTIMIZE_CTA_LABEL}`. `HomeHero.tsx` is byte-identical and
          `/optimize` renders byte-identical — both proved in the brief report.
          ⚠ DO NOT "TIDY" `HomeHero.tsx` AWAY as unused. It is not unused.

          ⚠⚠ THIS ALSO REMOVED `ProofStats` FROM `/`, because it renders INSIDE
          `HomeHero`. So `942 Assessments Completed`, `10M+ Total Savings` and
          `$6M+ Tax Savings` — the three figures `ProofStats.tsx:9` states are
          INVENTED — are no longer on the home page. ⚠ THEY STILL RENDER ON
          `/optimize`, untouched, and that row stays open. This is a CONSEQUENCE of
          Scott's instruction, not a decision taken here.

          ⚠ THE HERO IS NOW `HomeSections`' FIRST SECTION, full-width, carrying the
          same gradient, scrim and `/consultation.mp4` clip. See `HomeSections.tsx`.
        */}

        {/*
          ── ⚠⚠ THREE SECTIONS LEFT THIS PAGE ON 2026-08-24 (`P1-J0-E298`) ─────

          Scott, screenshotting `/`: *"let's REMOVE the ones we moved to optimize.
          I will redo what we need to add last."*

          `HowItWorks` (the five-card strip), `ProcessPicker` (step 1) and
          `SpineSteps` (steps 2-5) all rendered here AND on `/optimize`, which
          shipped in `1586502`. THE ASSESSMENT JOURNEY WAS ON THE SITE TWICE. This
          is the second half of a deliberately two-part move: `/optimize` was
          additive first — *"a destination exists and renders before anything comes
          off Home"* — and `optimize/page.tsx` recorded the duplication as
          time-boxed, with an instruction not to "fix" it by deleting either copy
          until this brief. This is that brief.

          ⚠ ALL THREE COMPONENTS ARE STILL IMPORTED AND STILL RENDER — on
          `/optimize`. `HowItWorks` there with `showStrip={false}`; `ProcessPicker`
          and `StepGraphic` from inside `OptimizeSteps`' panels. ⚠ DELETING ANY OF
          THOSE FILES BREAKS `/optimize`. Same rule as `E164` and `DashboardShot`:
          unimported from here, on disk, still owned.

          ⚠ THE FIVE `hiw-card` LINKS WENT WITH THE STRIP, so the `#step-process`
          and `#spine-step-2..5` fragments they pointed at are no longer TARGETED
          from this page — and the anchors themselves left with the spine, so
          nothing dangles. Verified after removal: zero `href="#..."` links remain
          on `/`.

          ⚠⚠ THIS BRIEF ONLY REMOVES. Scott: *"I will redo what we need to add
          last."* `GetTheTalent`, `WorkTracker`, `CapabilityFramework`,
          `MethodologyRing` and `Testimonials` are NOT on `/optimize` and STAY —
          removing them would delete content with no home. ⚠ Do not read the gap
          this leaves as an invitation to fill it.
        */}

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

        {/*
          ⚠ THE MACRO SECTION (`P1-J0-E314`). It goes HERE, directly after the hero,
          because it is exactly what the page currently lacks: `brief_home_strip`
          removed the strip, the picker and the spine, and `zero to hero` was spent
          on `/learn`'s `<h1>` (`E313`) — so `/` had no statement of what this place
          IS.

          ⚠ IT PRECEDES `GetTheTalent` DELIBERATELY — "your output is sellable" is
          the premise that makes a talent pitch land, not the other way round.

          ⚠ `brief_home_four_audiences` (`E311`) IS PARKED AND EDITS THIS SAME FILE.
          Different subject (WHO it is sold to — three parties SAVE, one MAKEs) and
          it belongs AFTER this one. See `OneWayTwoWay.tsx`'s header.
        */}
        {/*
          ── ⚠⚠ HOME'S SIX MENU SECTIONS (`P1-J0-E336`, 2026-08-27) ────────────────

          Scott: *"add all these section on top of the existing sections on home. The
          first thing I will do is normalize the sections."*
          ⚠ HE IS GOING TO CUT AND REORDER THIS PAGE HIMSELF. This block was INSERTED
          immediately after `HomeHero` and immediately before `OneWayTwoWay`; NOT ONE
          existing section was deleted, merged, reordered or tidied, and `HomeHero`
          and `ProofStats` were not touched.
          ⚠ ONE COMPONENT, SIX INSTANCES — the six differ only in DATA
          (`lib/home-sections.ts`). Reordering that array re-stripes the page, which
          is what he needs.
          ⚠ THE SIX CTA LABELS ARE DELIBERATELY DIFFERENT from the page heroes'. See
          that file's header before "fixing" them.
        */}
        <HomeSections />
        <OneWayTwoWay />
        {/*
          ⚠ `FourAudiences` (`E311`) IS NO LONGER PARKED and renders BELOW, after
          `MethodologyRing` — see the note at its render site for why it is not
          here. This comment's old claim that it "belongs AFTER this one" still
          holds; "after" turned out to mean after the Optimize block, not
          immediately after this section.
        */}
        <GetTheTalent />
        <WorkTracker />

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
          ── ⚠ BOTH ERP SECTIONS CAME OFF THIS PAGE, 2026-08-21 ────────────────
          ── `P1-J0-E273` (ErpPackages) and `P1-J0-E255` (ErpIntegration) ──────

          ⚠ THIS PAGE CARRIES A STANDING RULE AND THESE ARE THE **SECOND AND
          THIRD** DELIBERATE OVERRIDES OF IT. The rule, quoted from the note
          further up this file: *"ADDITIVE AND REORDER ONLY. Every section that
          used to sit here is still on the page, in its original relative order…
          retiring or relocating any of them is a separate owner decision, not a
          consequence of this one."* `E164` was the first override and recorded
          itself with the words *"this deletion was named and scoped; it is not a
          licence to prune."* Neither is this one.

          ⚠ NOTHING WAS MOVED, PORTED OR REBUILT. Both sections were rendering
          TWICE and this deletes the second render of each:

            ErpPackages     -> `/buy-services` (buy-services/page.tsx), where it
                               is that page's ENTIRE BODY — the `Shop` nav item's
                               whole reason to exist.
            ErpIntegration  -> `/enterprise` (enterprise/page.tsx:67), now the
                               `Integrate` nav item's destination (E245).

          ⚠ VERIFIED BY IDENTITY, NOT BY COMPARISON. Scott's condition on E255
          was that home's ERP graphic be *the exact same image* as Integrate's.
          Both call sites were byte-identical (`<ErpIntegration className=
          "erpx-band" />`), `className` is the component's only prop, and
          `.pm-home .erpx-band` has one definition (`home.css:1042`). One
          component, rendered twice; one render removed.

          ⚠ THE COMPONENT FILES BOTH STAY AND BOTH ARE STILL IMPORTED — by their
          surviving page. This is not `E164`'s case of an unimported orphan.

          ⚠ THE GUARD MOVED WITH THEM, WHICH WAS THE ACTUAL WORK.
          `e2e/marketing-home.spec.ts` asserted all six lightbox doorways on `/`
          through a single `goto("/")`. Every `Card` now carries its own `url` and
          the suite navigates per card — 60 tests before, 60 after, nothing
          skipped and nothing deleted. It also now asserts that NEITHER SECTION
          RENDERS HERE, so putting one back fails the build rather than quietly
          restoring the duplicate.

          ⚠ NOTHING ELSE COMES OFF `/`. `CapabilityFramework` and
          `MethodologyRing` above are becoming link targets under E270/E272 and
          are deliberately untouched.
        */}
        {/*
          ── ⚠⚠ WHO LEARN IS SOLD TO (`P1-J0-E311`), UNPARKED 2026-08-25 ────────

          It goes HERE, and the placement is a judgement worth recording. Three
          candidates:

            · directly after `OneWayTwoWay` — where that file's own comment guessed
              it would land. ⚠ REJECTED: it pushes the Optimize argument down, and
              `P1-J0-E297`'s selection of treatment `B` rests on ONE property Scott
              said he did not want to lose — *"the assessment stops being the
              loudest thing on the page around band three."* Two audience sections
              back to back before `GetTheTalent` spends that.
            · at the very bottom, after `Testimonials`. ⚠ REJECTED: the only Learn
              content on `/` should not be below the closing proof.
            · HERE — after `MethodologyRing` closes the Optimize argument and
              before `TalentTeaser` opens the Talent one. ⚠ CHOSEN: it is the seam,
              and the MAKE row hands directly into the talent pitch.

          ⚠ IT IS THE ONLY LEARN CONTENT ON `/`. There is no Learn pillar row yet —
          `P1-J0-E297` selects treatment `B` for six of them and NONE EXIST. That is
          survivable because this section carries its own `Learn` eyebrow, but see
          the component header: when the pillar row lands it will carry a CONDENSED
          Learn value summary and this is a second one, which is `E162`/`E242`'s
          shape. ⚠ THE TWO MUST BE DESIGNED TOGETHER. Reported, not decided.

          ⚠ ONLY ROW 4's SENTENCE IS SCOTT'S. The other three, all three labels and
          the limit line are CC's drafts, marked at their sites.
        */}
        <FourAudiences />
        <TalentTeaser />
        <Testimonials />
        {/*
          ── ⚠⚠ PARKED FROM `/talent` (`P1-J1-E030`) ─────────────────────────

          Scott: *"i do not think we will need them, but i will leave them on the
          last page to get refined for now."* ⚠ THIS IS A PARKING PLACE. They are
          NOT integrated into `/`'s narrative, NOT re-worded and NOT redesigned —
          the order is the order they had on `/talent`.

          ⚠ `VideoSequence` WAS REPOINTED AT THE `-hero` CUTS IN THE SAME COMMIT.
          It eager-loaded four FULL-SIZE clips — 10.63MB — and `/` already serves
          `consultation` as its hero, so moving it here unchanged would have made
          `/` the heaviest page on the site. See `VideoSequence.tsx`.
        */}
        <ValueStack />
        <VideoSequence audience="buyer" />
        <AppShots page="hire" />
        {/*
          ── ⚠⚠ NINE MORE PARKED, FROM `/find-work` (`P1-J4-E023`) ────────────

          Scott moved them; they keep the order they had on `/find-work`, after the
          three `walk-fixes` parked from `/talent`. ⚠ A PARKING PLACE — not
          re-worded, not re-styled, not woven into `/`'s narrative.

          ⚠⚠ `VideoSequence` AND `AppShots` ARE NOT REPEATED HERE. `/find-work`
          carried `audience="provider"` and `page="work"`; `/` already renders the
          same two components as `audience="buyer"` and `page="hire"` three lines
          above. ⚠ THE PROVIDER/WORK VARIANTS ARE NOW UNRENDERED ANYWHERE ON THE
          SITE — stated in the brief report, not left to be found.

          ⚠ SEVEN OF THESE ARE `audience="provider"`, WHICH IS WHY THEY LEFT THE
          BUYER'S PAGE (`P1-J4-E005`). They are provider copy on a page that has no
          single audience yet, which is a smaller problem than provider copy on a
          page explicitly re-pointed at buyers.
        */}
        <ThreeWays />
        <AiMatch />
        <TwoPains />
        <OmniChannel />
        <GoDirectBionic />
        <ProfileViz />
        <FourBeats page="work" />
        <AiStrip audience="provider" />
        <ClosingCta audience="provider" />
      </div>
      {/*
        ── ⚠⚠ `ErpPunchout`, MOVED HERE FROM `/integrate` (`P1-J0-E333`) ─────────

        SCOTT, 2026-08-26, screenshotting *"Punch out for talent — not just parts."*:
        *"Move this graphic to the home page."*

        ⚠⚠ HE REVERSED HIMSELF AND THE DEAD INSTRUCTION IS QUOTED SO NOBODY RESTORES
        IT CITING `E020`:
          `P1-J1-E020`, 2026-08-24, same component:
            *"This needs to be moved to INTEGRATE."*
        `/hire-talent` -> `/integrate` on 2026-08-24, `/integrate` -> here on
        2026-08-26. ⚠ THE LATER INSTRUCTION WINS. Check the date before moving it on
        the strength of either note.

        ⚠ A MOVE, NOT A COPY — it renders on THIS PAGE ONLY. `/integrate` no longer
        imports it. Two copies of one diagram is two sources of truth.

        ── ⚠⚠ WHY IT SITS **OUTSIDE** THE `.pm-home` DIV ────────────────────────

        `ErpPunchout` is pure Tailwind — `bg-[#f6f4fb]`, `max-w-[1120px]`,
        `border-line`. `.pm-home` sets a FONT STACK, a COLOUR and a LINE-HEIGHT on
        everything inside it, so dropping this section into the wrapper above would
        restyle it in a way neither `/hire-talent` nor `/integrate` ever did.
        ⚠⚠ `/` IS THE `.pm-home` PAGE, so this is the one page where the naive
        placement is wrong. ⚠ THAT SCOPING TRAP HAS BITTEN FOUR TIMES (`.sd-n`,
        `P1-J0-E290`, the footer `P1-ALL-E013`, `/learn`'s hero) — measured here.
        ⚠ IT IS THE SAME REASON THE FOOTER BELOW IS OUT HERE. Two Tailwind sections
        escaping one ported stylesheet, for one reason.

        ⚠⚠ AND OUTSIDE `.pm-home` WAS NOT ENOUGH ON ITS OWN. `/` DOES NOT USE
        `MarketingShell` (`:61`, deliberate), so out here a section inherits raw
        `<body>` — Geist, `#171717`. The first attempt measured 33 property
        differences across all 37 elements. `ErpPunchout` NOW CARRIES
        `marketing-surface font-body` ON ITS OWN ROOT (Scott's call, 2026-08-26) and
        depends on no ancestor. ⚠ DO NOT "TIDY" THOSE CLASSES OFF IT.

        ── ⚠ PLACEMENT: LAST SECTION, BEFORE THE FOOTER ────────────────────────

        ⚠ SCOTT SAID "the home page" AND DID NOT SAY WHERE — this is the brief's
        stated default, not an invention: the same relative slot it held on
        `/integrate`, after the ERP material and before the footer.
        ⚠ ON `/` THERE IS NO ERP MATERIAL TO SIT AFTER — `ErpIntegration` and
        `ErpPackages` BOTH LEFT THIS PAGE (`P1-J0-E255`, `P1-J0-E273`) and render on
        `/integrate` and `/shop`. So "after the ERP material" resolves to "last",
        which is also the ONLY slot outside `.pm-home` that is in reading order.
        ⚠ IT FOLLOWS `ClosingCta audience="provider"` — a closing CTA is a strange
        thing to have a section after. REPORTED for Scott's walk rather than
        reordered, because the ordering above it is his.

        ⚠ `id="punchout"` TRAVELS WITH IT: once here, once on `/integrate` (re-homed
        onto that page's `ErpIntegration` wrapper). ⚠ ONE PER PAGE — two is a defect.
      */}
      <ErpPunchout />
      {/*
        ── ⚠⚠ THE FOOTER SITS OUTSIDE `.pm-home`, AND THAT IS LOAD-BEARING ────

        `P1-ALL-E020` measured it: inside the wrapper, `home.css` repainted the
        footer's inherited colour from `#cfc7da` to `#aeb4cf`, and the footer stood
        910px tall on five public pages and 1008px on this one. ⚠ ONE COMPONENT
        RENDERING IN TWO COLOURS AND TWO HEIGHTS IS EXACTLY WHAT "one footer, every
        public page" WAS MEANT TO END.

        ⚠ IT IS THE MIRROR OF `P1-ALL-E013`, WHICH `HomeFooter` FIXED BY *ADDING*
        `.pm-home`. That footer NEEDED the scope because its styles live in
        `home.css`; this one is Tailwind and has to ESCAPE it. Same trap, opposite
        ends.
      */}
      <MarketingFooter />
    </>
  );
}
