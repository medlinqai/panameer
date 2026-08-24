import Link from "next/link";
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
}: {
  ctaLabel?: string;
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
      <div className="hero-stage">
        <div className="hero-card">
          <HeroVideoBackdrop
            src="/consultation.mp4"
            videoClassName="hero-video"
            scrimClassName="hero-scrim"
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
                <h1>Optimize Your Business with AI</h1>
                {/* THE BUTTON GOES TO /assess. It was `#` — an honest stub while
                  the assessment did not exist. No `›` affectation. */}
                <Link href="/assess" className="hero-cta">
                  {ctaLabel}
                </Link>
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
                <p>
                  See where you stand and where AI can move the needle in your
                  business. Then build your 12-month roadmap with an expert
                  &mdash; all for&nbsp;free.
                </p>
                {/*
                ⚠ A DISTINCT BEAT, NOT A SENTENCE ON THE LEDE. It is the bridge into
                the spine below, so it gets its own `<p>` and a lighter magenta to read
                as a pointer rather than as body copy.

                ⚠ NOT A LINK AND NOT A SCROLL ANCHOR — this is copy only. It says
                "below", and the spine is directly below it, so the page does the
                pointing. Making it interactive is a separate decision.
              */}
                <p className="hero-bridge">
                  Check out the steps below to see how it works.
                </p>
                {/* WS-9 — one shared component; /assess step 0 renders the same source.
                  ⚠ THE CARDS STAY ON THE RIGHT, below the lede. Scott: "i want to keep
                  the cards on the right." The taller lede re-centres the left column
                  against them; it does not move them. */}
                <ProofStats />
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
