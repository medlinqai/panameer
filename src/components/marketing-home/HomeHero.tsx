import type { ReactNode } from "react";
import Link from "next/link";
import { HeroBox } from "@/components/marketing/HeroBox";
import {
  HERO_BRIDGE_CLASS,
  HERO_BRIDGE_TEXT,
  HERO_BUTTON,
  HERO_BUTTON_OUTLINE,
  HERO_CARD,
  HERO_DESC_CLASS,
  HERO_SCRIM,
} from "@/components/marketing/hero-treatment";
import { ProofStats } from "@/components/marketing/ProofStats";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { HeroTwoUp } from "@/components/marketing/HeroTwoUp";

/**
 * HERO — the dark video CARD (brief_home_hero_dark_card_2026-08-13).
 *
 * WHAT CHANGED, AND ONLY THIS. The copy, the CTA and the three stats are
 * untouched from the ported mockup. What went is the framing and the
 * background: a full-bleed light panel with a `.grid-bg` overlay — a paper grid
 * under a pink top-tint — becomes an inset dark card with real footage behind
 * it. Scott's note was "too much pink"; the tint was the pink.
 *
 * ── THE VIDEO IS THE LEARN HERO'S VIDEO ──────────────────────────────────────
 *
 * `HeroVideoBackdrop` is the Learn hero's treatment, extracted so this is the
 * same component rather than a copy of it: a real clip, a gradient under it and
 * the same ramp re-laid over it so the white text never depends on the footage.
 * The exploration mockup faked this with an animated blurred radial, which is
 * exactly what the brief says not to ship.
 *
 * `/consultation.mp4` rather than `/learn.mp4`. Both are from the same shoot
 * (`05. Home Assets`), so they carry the same grade — but learn.mp4 is spoken
 * for: it plays in the Learn hero and in the Learn beat of the video sequence,
 * and reusing it here would make the page's opening shot the "learning" shot.
 * consultation.mp4 is the advisory clip, which is what this page is selling.
 *
 * ── STILL A SERVER COMPONENT ─────────────────────────────────────────────────
 *
 * No hook, no island — reduced motion is handled by the `data-autoplay-video`
 * rule in globals.css. `/` prerendering static is a build gate (see the note in
 * `app/page.tsx`) and adding an island for a media query would have spent it
 * for nothing.
 */
export function HomeHero({
  /**
   * ⚠ ONE STRING, ONE CALLER, AND `/` KEEPS ITS OWN (P1-J0-E259).
   *
   * `/optimize` renders this hero unchanged — same art, same headline, same stat
   * row — and differs in exactly one word-group: its CTA reads `Start the
   * Assessment`, because on that page the button is the page's own next step
   * rather than a hand-off to somewhere else. `/` still reads `Take Our Free
   * Assessment` and is byte-identical, which is what the default guarantees.
   *
   * ⚠ THE HREF DOES NOT MOVE. Both go to `/assess` — that is where the wizard
   * is, and `/optimize` does not embed it. Only the label changes.
   */
  ctaLabel = "Take Our Free Assessment",
  /*
    ⚠⚠ `headline` AND `description` ARE PROPS BECAUSE `/` AND `/optimize` ARE ONE
    COMPONENT (`P1-ALL-E031` amendment §3).

    `/optimize` gained Scott's approved description in this brief. Without these
    props that string would have landed on `/` too, and Scott is explicit that `/`
    waits: *"let's handle HOME after this brief and the other pages have been
    finalized."*
    ⚠ THE DEFAULTS ARE `/`'s CURRENT STRINGS, and `/` ALSO PASSES THEM EXPLICITLY —
    belt and braces, so a future caller that forgets cannot silently retitle the
    home page. ⚠ THE STRINGS ARE UNCHANGED BYTE FOR BYTE; see `app/page.tsx`.
  */
  headline = "Optimize Your Business with AI",
  description = (
    <>
      See where you stand and where AI can move the needle in your business. Then
      build your 12-month roadmap with an expert &mdash; all for&nbsp;free.
    </>
  ),
  /*
    ⚠⚠ THE SECOND CONTROL IS OPT-IN AND MUST STAY THAT WAY (`P1-J0-E352`).
    Scott asked for it on `/optimize` only: *"put it below the Start Your Free
    Optimization… in the /optimize hero"*. BOTH PROPS DEFAULT TO `undefined` and the
    button renders NOTHING when either is absent, so every other caller — and `/`,
    which shares this component — produces BYTE-IDENTICAL output. Proved in the
    `E352` report by diffing the rendered HTML of six pages, not by reading the code.
    ⚠ BOTH ARE REQUIRED TOGETHER. A label with no href would be a dead control and an
    href with no label an invisible one, so the render tests for both.
  */
  secondaryCtaLabel,
  secondaryCtaHref,
}: {
  ctaLabel?: string;
  headline?: ReactNode;
  description?: ReactNode;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
} = {}) {
  return (
    <section className="hero">
      {/*
        Two elements where the mockup had one. `.hero-stage` holds the page
        margin the card is inset by; `.hero-card` is the card. They cannot be
        the same element — the card clips its own video to a 26px radius with
        `overflow:hidden`, and an element that clips cannot also be the one
        holding it away from the viewport edge.
      */}
      {/*
        ── ⚠⚠ `HeroBox` NOW, AND THE `hero-card` CLASS RIDES ALONG ON PURPOSE ────

        `P1-ALL-E031`: this was the last hero not using `HeroBox`, which was the
        entire divergence. ⚠ `HeroBox`'s GEOMETRY IS THIS PAGE'S OWN — its comment
        records it was measured off `/` (stage 6px/44px -> 6px/10px, radius 26 -> 20),
        so the swap is geometry-neutral by construction.

        ⚠⚠ SUPERSEDED, quoted not deleted — `HeroBox`'s own reason for `HomeHero`
        staying out, which was true and is now overruled by Scott's consistency ask:
          *"`HomeHero` already renders the target treatment — it is the page Scott
           says is CORRECT — and its inset lives in `.pm-home`-scoped CSS that is
           coupled to `.hero-card .wrap`, the video clip, the grain and the scrim.
           There is also a measured constraint recorded in `home.css`: at 390 the H1
           needs >=326px of measure and the current 10px + 20px gives it 330."*

        ⚠⚠ THAT COUPLING IS REAL, AND IT IS WHY `hero-card` IS STILL IN THE CLASS
        LIST. `.pm-home .hero-card .wrap{padding:0 20px}` is a DESCENDANT rule: drop
        the class and the mobile 20px goes with it, taking the H1's measure at 390
        from 330px to 310px — under the recorded 326px floor — and wrapping the
        headline to four lines. The class is kept so that rule still matches.
        ⚠ `home.css`'s `.pm-home .hero-card` NO LONGER PAINTS A BACKGROUND — its
        `background` and `box-shadow` were removed so `HERO_CARD` is the ONLY source
        of this card's surface. Its padding and radius stay; they are the geometry.
        ⚠ THAT IS A DELETION FROM AN EXISTING RULE, NOT NEW GLOBAL CSS.

        ⚠ THE VIDEO CLASS IS THE STANDARD ONE NOW, not `.hero-video` — the other six
        heroes all pass `absolute inset-0 h-full w-full object-cover opacity-40`, and
        depending on a `.pm-home` rule for it is what made this hero special.
        ⚠ `.hero-grain` STAYS: it is decorative, it is inside `.pm-home` on both
        pages, and it is the one part of the old treatment worth keeping.
      */}
      <HeroBox cardClassName={`hero-card ${HERO_CARD}`}>
        <div className="hero-card-inner">
          <HeroVideoBackdrop
            src="/consultation.mp4"
            videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
            scrimClassName={HERO_SCRIM}
          />
          {/*
            The grid survives the redesign, inverted: white hairlines at 14%
            instead of the light panel's gray ones. It is the one part of the
            old treatment worth keeping — it gives the card a surface, so the
            gradient reads as a lit room rather than a CSS fill.
          */}
          <div aria-hidden className="hero-grain" />

          {/*
            ⚠ THE ROW IS `HeroTwoUp` NOW, AND THE CLASS NAMES ARE UNCHANGED
            (`P1-J0-E291`). `/learn` needed this hero's two-column structure and
            could not have its stylesheet — see that component's note. The three
            class strings passed here are byte-for-byte what this file emitted
            before the extraction, which is why `/optimize` measured identical at
            1440 / 900 / 390 rather than merely looking the same.
          */}
          <HeroTwoUp
            rowClassName="wrap hero-row"
            leftClassName="hero-left"
            rightClassName="hero-right"
            left={
              <>
                {/*
                ⚠ BOTH STRINGS ARE THE OWNER'S AND THEY ARE SETTLED.

                This pair has now been round the houses: it was a claim + a
                question, then a question + a verb, and it is back to the claim
                + the verb. I argued twice that "optimize your business" is the
                phrase every ERP vendor uses and therefore slides off; the owner
                overruled it both times, which is his call to make.

                DO NOT soften, lengthen or "improve" either string. If they
                change again it will be because he says so.
              */}
                <h1>{headline}</h1>
                {/* THE BUTTON GOES TO /assess. It was `#` — an honest stub while
                  the assessment did not exist. No `›` affectation. */}
                {/*
                  ⚠ THE STANDARD BUTTON (`HERO_BUTTON`), NOT `.hero-cta`. Scott named
                  `/work`'s CTA as the one he likes and this is it.
                  ⚠ THE HREF IS UNCHANGED AND WAS ALREADY `/assess`. The brief's WS4
                  said *"`/` HAS NO BUTTON"* and asked chat to choose an href — BOTH
                  HALVES WERE ALREADY FALSE: `ctaLabel` defaults to `Take Our Free
                  Assessment` and the link already pointed at `/assess`. Reported.
                */}
                <Link href="/assess" className={HERO_BUTTON}>
                  {ctaLabel}
                </Link>
                {/*
                  ── ⚠⚠ THE SECOND, OUTLINED CONTROL (`P1-J0-E352`) ─────────────

                  Scott: *"Create a button like 'Browse Catalog', put it below the
                  Start Your Free Optimization…"* — BELOW, so STACKED, not a
                  side-by-side pair. `HERO_BUTTON_OUTLINE` is the skin `Browse the
                  Catalog` on `/learn` already uses, so a page growing a second
                  control does not invent a third shape.

                  ⚠⚠ `HERO_BUTTON_OUTLINE` IS IMPORTED, NEVER RE-TYPED, RE-WRAPPED OR
                  CONCATENATED. Tailwind scans source text for whole class tokens and
                  never evaluates JavaScript — a class split across a `+` is invisible
                  to it, which is exactly how `HERO_SCRIM` shipped DEAD on seven pages
                  for two days (`E338`). The constant carries its own
                  `prettier-ignore` for the same reason. ⚠ It also carries a
                  translucent fill from `P1-J3-E033`, because a white label on a bare
                  border failed contrast. DO NOT STRIP IT.

                  ⚠ THE STACK GAP IS SET HERE, NOT IN THE CONSTANT. Both constants
                  carry `mt-8`; two of those stacked is too much air, so this call
                  site overrides the second one down. ⚠ SIX OTHER HEROES RENDER THESE
                  CONSTANTS — editing either one to fix spacing here would move all of
                  them. The override is a wrapper `div`, so the constant's own class
                  string is untouched and Tailwind still sees it whole.
                  ⚠ MEASURED, NOT GUESSED: the gap and the label widths at
                  1440/1160/768/390 are in the `E352` report.
                */}
                {secondaryCtaLabel && secondaryCtaHref ? (
                  <div className="-mt-4">
                    <Link href={secondaryCtaHref} className={HERO_BUTTON_OUTLINE}>
                      {secondaryCtaLabel}
                    </Link>
                  </div>
                ) : null}
              </>
            }
            right={
              <>
                {/*
                ⚠ THE HERO NO LONGER CARRIES THE TWO-OUTPUTS SPLIT (E160), AND THE
                DECISION BEHIND IT IS UNCHANGED — only its mention here is dropped.

                This used to read "…an AI Roadmap built with an expert — the ones you
                actually require, in priority order." Scott replaced it because the
                lede named the outputs and no action: "the tagline is missing
                something...naming the output and the action." The new copy carries
                four beats he specified — what it is · why you need to see it (the
                industry comparison) · what we do about it · it is free — and the
                requirements/sequence split does not fit alongside them.

                ⚠ "REQUIREMENTS", NOT "SEQUENCE THEM" IS STILL LOCKED. Scott: "They
                never want every option in the world of possible. So we select what
                they REQUIRE — everyone knows and uses requirements terminology — and
                then prioritize." The roadmap is not the option list re-ordered; it is
                the SUBSET the client requires, prioritized. It now lives in Step 5's
                title in `spine-steps.ts`, in `AiRoadmapShot`'s output copy, and in
                `assessment_engine_spec.md`. Do not restore it here to "fix" the hero.
              */}
                {/*
                ⚠ "versus", NOT "against" — AND IT IS THE CONSISTENT CHOICE, not just
                the softer one. `OptimizationDashboardShot` already ships "Your Org
                Versus Industry", so the hero and the dashboard now use one word.

                ⚠ "your processes" IS GONE FROM THE FIRST CLAUSE, and that is a real
                loss: it made the comparison concrete rather than a generic industry
                benchmark. Scott accepted the trade to recover a line (E166). Do not
                reinstate it.
              */}
                {/*
                ⚠ `&nbsp;` BETWEEN "all" AND "free." IS A GUARD, NOT THE FIX (E169).
                Scott: "That last wrap and giving the word 'free' its own line is not
                correct. It is why I consented to removing 'actually'." The shortening
                that removed "actually" brought the line count down and handed the
                orphan straight back.

                On its own the nbsp only converts a one-word orphan into a two-word
                one — it is here so the defect cannot return at a width nobody
                measured. The real fix is the shorter second sentence beside it.

                ⚠ THE PRODUCT NAME IS NO LONGER IN THE LEDE. "Take our AI Maturity
                Assessment to" is gone from the opening. It still appears in the CTA
                immediately below ("Take Our Free Assessment"), on the Step 2 wizard
                shot, on the dashboard and in ErpIntegration — so the page still names
                it, just not here. Putting it back brings the orphan back with it and
                something else has to give; that is Scott's trade to make, not mine.

                ⚠ THE INDUSTRY COMPARISON IS GONE FROM THE HERO TOO (E175) — Scott's third
                pass on this sentence. Flagged, not argued.

                It read "…where you stand versus your industry and where AI moves the
                needle." He added that beat deliberately on 2026-08-18 ("peers/industry
                comparison was left out by me on accident"), and it is the reason E166 chose
                "versus" over "against" — to match `OptimizationDashboardShot`'s "Your Org
                Versus Industry". It now reads "…where you stand and where AI can move the
                needle IN YOUR BUSINESS", which does different work: the promise is personal
                rather than comparative. Note "can" comes BACK — E166 had cut it to recover a
                line.

                ⚠ TWO CONSEQUENCES, BEFORE ANYONE "RESTORES" IT.
                  1. The industry-comparison claim is a counsel-gate item — a benchmark
                     derived from the maturity ladder, not surveyed — so dropping it from the
                     headline REDUCES exposure. Deliberate or incidental, it is Scott's.
                  2. "versus" still ships on the Step 4 dashboard shot, untouched. The word
                     is no longer used in two places for consistency; it is used in one.
              */}
                <p className={HERO_DESC_CLASS}>{description}</p>
                {/*
                ⚠ A DISTINCT BEAT, NOT A SENTENCE ON THE LEDE. It is the bridge into
                the spine below, so it gets its own `<p>` and a lighter magenta to read
                as a pointer rather than as body copy.

                ⚠ NOT A LINK AND NOT A SCROLL ANCHOR — this is copy only. It says
                "below", and the spine is directly below it, so the page does the
                pointing. Making it interactive is a separate decision.
              */}
                <p className={HERO_BRIDGE_CLASS}>{HERO_BRIDGE_TEXT}</p>
                {/* WS-9 — one shared component; /assess step 0 renders the same source.
                  ⚠ THE CARDS STAY ON THE RIGHT, below the lede. Scott: "i want to keep
                  the cards on the right." The taller lede re-centres the left column
                  against them; it does not move them. */}
                <ProofStats />
              </>
            }
          />
        </div>
      </HeroBox>
    </section>
  );
}
