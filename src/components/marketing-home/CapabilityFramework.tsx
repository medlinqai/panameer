import { CapabilityExplorer } from "@/components/marketing-home/CapabilityExplorer";
import { OTHER_PROCESSES } from "@/lib/capability-domains";

/**
 * "Optimize by Capability Domain" — the section head and the process tabs.
 *
 * ⚠ SAMPLE FIGURES. The maturity numbers behind the card are illustrative and
 * live in `lib/capability-domains.ts`; the card badge says "Sample" so the page
 * says so too.
 *
 * ── THE STALE CLAIM THAT USED TO BE HERE ─────────────────────────────────────
 *
 * This comment said making the tabs interactive "would cost `/` its static
 * prerender". THAT WAS WRONG and is deleted rather than softened: a Client
 * Component still prerenders to HTML at build time. A route goes dynamic only
 * when a dynamic API enters the tree, and holding a selected-domain string in
 * `useState` is not one. The selectable half is `CapabilityExplorer`; `/` is
 * still ○ in the build output.
 *
 * This component stays a SERVER component so the island is only as big as the
 * part that actually needs state.
 */
export function CapabilityFramework() {
  return (
    <>
      {/* FRAMEWORK */}
      <section className="block fw">
        <div className="wrap fw-head">
          <div className="fw-top">
            <div>
              <div className="eyebrow">The Framework</div>
              <h2>Optimize by Capability Domain</h2>
            </div>
            <p>We optimize using a capability domain framework for the business processes your organization uses.</p>
          </div>
          {/*
            WS-5 — ONLY P2P IS INTERACTIVE. The other three are rendered
            disabled rather than hidden: hiding them would misrepresent the
            framework as procurement-only, and inventing capability domains and
            figures for them is exactly what the brief forbids. `aria-disabled`
            plus no handler, so they are announced as unavailable rather than
            silently doing nothing.
          */}
          <div className="tabs">
            <div className="tab on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Procure-to-Pay</div>
            {OTHER_PROCESSES.map((name) => (
              <div className="tab off" key={name} aria-disabled="true">
                {name}
                <span className="soon">Coming soon</span>
              </div>
            ))}
          </div>
          <CapabilityExplorer />
        </div>
      </section>
    </>
  );
}
