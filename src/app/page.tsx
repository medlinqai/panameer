import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeSections } from "@/components/marketing-home/HomeSections";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
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
          ⚠⚠ THAT WAS TRUE OF `E298` AND THREE OF THE FIVE HAVE SINCE LEFT. Kept as
          the historical record of what `E298` decided, NOT as a current statement:
          `GetTheTalent` and `WorkTracker` came off at `P1-J0-E350` and render
          NOWHERE; `CapabilityFramework` came off at `P1-J0-E355` and now renders
          only on `/capability-domains`. ⚠ `MethodologyRing` and `Testimonials` are
          the two that still stand. See the `E350`/`E351`/`E355` tombstone below.
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
        {/*
          ── ⚠ THE TAGLINE BAND WAS HERE AND IS GONE (`P1-J0-E340` -> `P1-J0-E349`) ──

          `E340` ADDED a full-width lilac `#F6F3FA` strip here rendering
          `BRAND_DESCRIPTOR`, between `<HomeSections />` and `<OneWayTwoWay />`. Its
          placement and styling were CHAT'S OWN INFERENCE from a one-line instruction
          (*"should be somewhere outside"* the hero), and the `E340` report flagged
          that so Scott could move it. ⚠ HE REMOVED IT INSTEAD, 2026-08-28: *"REMOVE
          image 1."* `E349` deleted the band and its `BRAND_DESCRIPTOR` import.

          ⚠⚠ DO NOT RE-ADD IT FROM THE `E340` REPORT OR ITS COMMENT. That block is
          history; this is the live decision.
          ⚠ THIS NOTE SAID *"`<HomeSections />` is followed directly by
          `<OneWayTwoWay />` on purpose"* — TRUE AT `E349`, FALSE SINCE `P1-J0-E350`,
          which removed `OneWayTwoWay` from this page along with sixteen others. See
          the `E350` tombstone directly below. `<HomeSections />` is now followed by
          that tombstone and then the pre-spine block.
          ⚠ `BRAND_DESCRIPTOR` IS NOT RETIRED and `lib/brand.ts` is untouched. It
          keeps three consumers, all unchanged: `MarketingFooter`'s band 2 and its
          legal bar (both on every public page) and `OnboardingFrame`. `/` still
          renders it twice, in the footer. This removed ONE consumer, not the string.
          ⚠ IT WAS NOT MOVED TO `MarketingHeader` — he said remove, not relocate.
        */}
        {/*
          ── ⚠⚠ SEVENTEEN SECTIONS CAME OFF `/` (`P1-J0-E350`, 2026-08-28) ─────────

          Scott walked the page and listed them. This is the tombstone for the whole
          run so the next reader does not restore one from an older comment.

          REMOVED FROM THIS PAGE, in the order they used to appear:
            1  OneWayTwoWay                       (was here, after HomeSections)
            2  GetTheTalent            3  WorkTracker
            4  FourAudiences           5  TalentTeaser     (were after MethodologyRing)
            6  VideoSequence audience="buyer"     7  AppShots page="hire"
            8  ThreeWays               9  AiMatch         10  TwoPains
           11  OmniChannel            12  GoDirectBionic  13  ProfileViz
           14  FourBeats page="work"  15  AiStrip audience="provider"
           16  ClosingCta audience="provider"
           17  ErpPunchout                         (was below the `.pm-home` wrapper)

          ⚠⚠ `E164` STILL HOLDS: ALL SEVENTEEN `.tsx` FILES STAY ON DISK, UNMODIFIED.
          Only the render calls and their imports went. That is what makes this
          reversible, and it is why none of them was "tidied away" as unused.
          ⚠ `src/lib/brand.ts` IS UNTOUCHED. Most of these read their copy from it and
          it now looks like dead weight. IT IS NOT — `/talent`, `/work`, `/shop`,
          `/learn` and `/integrate` read from it too.

          ⚠ SEVERAL NOW RENDER ON NO PAGE AT ALL. That is the instruction, recorded
          rather than an oversight. ⚠ `GetTheTalent` IS THE ONE TO WATCH: Scott,
          2026-08-28 — *"the hire talent from within your roadmap should move to the
          optimization section."* Which parts become `/optimize`'s step 6 is STILL
          OPEN and is a separate brief. Between that commit and this one it renders
          nowhere, KNOWN AND ACCEPTED. ⚠ Do not park it somewhere to keep it alive.

          ⚠⚠ AN EIGHTEENTH FOLLOWED, `P1-J0-E351`: `ValueStack` (eyebrow `WHAT
          PROCUREMENT GETS`). `E350` KEPT IT ON PURPOSE — it was in none of Scott's
          screenshots, so that brief gated on it SURVIVING — and he then walked the
          result and named it: *"still there."* That reverses one `E350` gate and
          nothing else. ⚠ `ValueStack.tsx` stays on disk under `E164` like the other
          seventeen. ⚠ NO DEAD ANCHOR: it owns `id="value"`, and the only three
          mentions of `#value` in the tree are comments — the footer's `Pricing`
          entry is plain text with no `href` (`brand.tsx:379`), checked before
          deleting rather than after.
          ⚠ `Testimonials` IS NOW THE ONLY SECTION between `MethodologyRing` and the
          closing `</div>` and WILL LOOK STRANDED. Scott has not named it. LEAVE IT —
          he has since confirmed: *"will stay..will produce those last."*

          ⚠⚠ A NINETEENTH FOLLOWED, `P1-J0-E355`: `CapabilityFramework`. Scott,
          pointing at it on `/`: *"REMOVE this SECTION from the HOME page."*
          ⚠ THE HISTORY MATTERS HERE MORE THAN USUAL, because this one reverses a
          decision that was correct when it was made. `E350` and `E351` KEPT it —
          he had walked `/` three times and never named it, so both briefs gated on
          it SURVIVING. `E352` then built `/capability-domains` and was explicit that
          it was a COPY NOT A MOVE, gating `page.tsx` byte-identical for exactly that
          reason. He named it on 2026-08-28 and `E355` turned that copy into a move.
          ⚠ SO THE FRAMEWORK NOW RENDERS ON EXACTLY ONE PAGE: `/capability-domains`,
          reached from `/optimize`'s second hero button. That is the answer to "why
          is the framework only on its own page?".
          ⚠ NO DEAD ANCHOR, CHECKED BEFORE DELETING (the `#punchout` lesson from
          `E350`): `CapabilityFramework` renders NO `id` at all, `CapabilityExplorer`
          renders none either, and `#framework`, `#fw` and `#capability` appear
          NOWHERE in `src/` — not as an `href`, not as a string.
          ⚠ `CapabilityFramework.tsx` AND `CapabilityExplorer.tsx` STAY ON DISK and
          are still LIVE — unlike the other eighteen they are not dormant, they are
          the components `/capability-domains` renders.

          ⚠ THE GAPS THIS LEAVES ARE DELIBERATE. Nothing that survives was re-ordered,
          re-spaced or re-styled — Scott wants to look at the result before anything
          is closed up.
          ⚠ `#punchout` LOST ITS TARGET WITH `ErpPunchout` AND WAS REPOINTED, not left
          dangling: HOME section 6's `ctaHref` is now `/integrate#punchout`. See
          `home-sections.ts`.
        */}

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

          ⚠ THIS NOTE USED TO READ *"NOTHING ELSE COMES OFF `/`. `CapabilityFramework`
          and `MethodologyRing` above are becoming link targets under E270/E272 and
          are deliberately untouched."* ⚠ BOTH HALVES ARE NOW WRONG FOR
          `CapabilityFramework`: it came off at `P1-J0-E355` on Scott's instruction
          (*"REMOVE this SECTION from the HOME page."*) and now renders ONLY on
          `/capability-domains`.
          ⚠ `MethodologyRing` ABOVE IS STILL HERE and is still untouched — it has not
          been named. So has `Testimonials` below; Scott: *"will stay..will produce
          those last."*
          ⚠⚠ AND NOTHING UNDER `E270`/`E272` EVER DEPENDED ON EITHER BEING ON `/` —
          checked, not assumed. `E270` was a *"Click here"* line from `SpineSteps`
          STEP 2 down to the framework; `E272` was a link from `WorkTracker` down to
          the method. NEITHER LINK WAS EVER WIRED — there is no `href="#..."` for
          either anywhere in `src/`, and `CapabilityFramework` renders no `id` to
          target. Both SOURCE sections are also already gone from this page:
          `SpineSteps` left at `E298` (it renders on `/optimize`) and `WorkTracker`
          at `E350` (it renders nowhere). So the removal breaks no link that exists.
        */}
        <Testimonials />
      </div>
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
