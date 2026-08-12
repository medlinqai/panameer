/**
 * Footer (brief §9) — built as-is.
 *
 * ⚠ PLACEHOLDER, per the brief. "Modern AI optimization platform for
 * high-growth businesses" is StratERP-era copy, and the four link columns
 * (Platform / Solutions / Features / Company) name products Panameer does not
 * have. Every one of those links is `#` in the mockup and stays `#` here —
 * which is at least honest about being unbuilt, where routing them somewhere
 * plausible would not be. Scott replaces the wording later.
 *
 * ONE SUBSTITUTION: the mockup inlines the wordmark as base64; this uses the
 * app's own /brand asset, per the brief's images note. The ON-DARK variant —
 * the footer is navy, and the on-light wordmark rendered as a faint smudge.
 */
export function HomeFooter() {
  return (
    <>
      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- the ported
          stylesheet sizes this by class (.brand-logo/.foot-logo); next/image
          needs explicit dimensions and would fight the mockup's CSS for a
          30px-tall wordmark. Same call the rest of the marketing surface makes. */}
      <img className="brand-logo foot-logo" src="/brand/panameer-new-on-dark.png" alt="Panameer" />
              <div className="foot-desc">Modern AI optimization platform for high-growth businesses.</div>
              <div className="socials"><a href="#">f</a><a href="#">in</a><a href="#">tw</a></div>
            </div>
            <div className="fcol">
              <h5>Platform</h5>
              <a href="#">Collaboration</a><a href="#">Data Management</a><a href="#">Strategic Platform</a><a href="#">Plans</a>
            </div>
            <div className="fcol">
              <h5>Solutions</h5>
              <a href="#">Top-Line Planning</a><a href="#">Modeling</a><a href="#">Investor &amp; Board Reporting</a>
            </div>
            <div className="fcol">
              <h5>Features</h5>
              <a href="#">API</a><a href="#">Sales &amp; Marketing</a><a href="#">eCommerce</a><a href="#">Business</a>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <a href="#">About</a><a href="#">Career</a><a href="#">Referral Program</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© 2026 Panameer Inc. All rights reserved.</span>
            <span className="lg"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Legal</a></span>
          </div>
        </div>
      </footer>
    </>
  );
}
