import { SHOW_TAX_SAVINGS_STAT } from "@/lib/home-flags";

/**
 * HERO — ported verbatim from the mockup (brief §2).
 *
 * H1, subhead, CTA and the three stat tiles are the mockup's copy exactly;
 * layout comes from `home.css` (.hero / .grid-bg / .stats), which is the
 * mockup's own CSS scoped to `.pm-home`.
 *
 * The CTA is `#` in the mockup and stays `#` here. The brief allows an honest
 * stub, and inventing a destination would be inventing product.
 */
export function HomeHero() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-top">
        <div className="grid-bg"></div>
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
      </section>
    </>
  );
}
