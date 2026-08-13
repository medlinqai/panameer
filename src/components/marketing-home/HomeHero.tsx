import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { SHOW_TAX_SAVINGS_STAT } from "@/lib/home-flags";

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
export function HomeHero() {
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

          <div className="wrap hero-row">
            <div className="hero-left">
              <h1>Optimize Your<br />Business with AI</h1>
              <a href="#" className="hero-cta">Where Can AI Help My Business? <span>›</span></a>
            </div>
            <div className="hero-right">
              <p>Discover exactly where AI can move the needle in your business — our free maturity assessment benchmarks your current capabilities and shows you where to focus first.</p>
              <div className="stats">
                <div className="stat"><span className="big">942</span><span className="lbl">Assessments<br />Completed</span></div>
                <div className="stat"><span className="big">10M+</span><span className="lbl">Total<br />Savings</span></div>
                {/*
                  ⚠ COUNSEL-GATED (brief §2, approach_to_market.md). A guaranteed
                  tax-savings claim needs CPA + lawyer sign-off before it faces the
                  public. It is behind a single flag rather than commented out so the
                  mockup renders as specified in dev, and turning it off in production
                  is one env var — not a code change under time pressure.
                */}
                {SHOW_TAX_SAVINGS_STAT && (
                  <div className="stat"><span className="big">$6M+</span><span className="lbl">Tax Savings Used<br />to Fund Deployment</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
