/**
 * "Optimize by Capability Domain" (brief §7) — built as-is.
 *
 * ⚠ PLACEHOLDER CONTENT, per the brief: the four tabs are static (the first is
 * pre-selected via the mockup's `.on` class) and the maturity figures are
 * sample values. Scott revises the content later.
 *
 * THE TABS ARE NOT INTERACTIVE, deliberately. Making them switch would need a
 * client island, which would cost `/` its static prerender for a control the
 * mockup does not specify behaviour for. Presentational, like the dashboard.
 *
 * ⚠ ONE DEPARTURE, FLAGGED: the mockup labels this card "● Live". Nothing here
 * is live — these are sample numbers — and a green Live pill on invented data
 * is the one element that actively asserts something false. Left as the mockup
 * has it per "build as-is", but called out in the report as the first thing to
 * change if this page faces the public before the assessment engine exists.
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
          <div className="tabs">
            <div className="tab on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>Procure-to-Pay</div>
            <div className="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>Order-to-Cash</div>
            <div className="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></svg>Record-to-Report</div>
            <div className="tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>Hire-to-Retire</div>
          </div>
          <div className="fw-body">
            <div>
              <h3>Procure-to-Pay Capability Domains</h3>
              <ul className="caps">
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Requisitioning &amp; Demand Management</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Sourcing &amp; Supplier Selection</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Contract Management</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Purchase Order Management</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Goods &amp; Services Receipt</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Invoice Processing &amp; Matching</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Payments &amp; Cash Management</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Supplier Risk &amp; Compliance</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Data, Analytics &amp; AI Governance</li>
                <li><span className="chk"><svg viewBox="0 0 24 24" fill="none" strokeWidth="3"><path d="m5 12 4 4 10-10" /></svg></span>Change Management &amp; AI Adoption</li>
              </ul>
            </div>
            <div className="mat-card">
              <div className="mat-head">
                <div><div className="ey">AI MATURITY DASHBOARD</div><h4>Procure-to-Pay</h4></div>
                <div className="live"><span className="d"></span>Live</div>
              </div>
              <div className="mat-kpis">
                <div className="mk"><div className="v">87%</div><div className="l">Touchless PO Rate</div><div className="t up">▲ +12% vs last qtr</div></div>
                <div className="mk"><div className="v">4.2%</div><div className="l">Maverick Spend</div><div className="t dn">▼ −8% vs last qtr</div></div>
                <div className="mk"><div className="v">94%</div><div className="l">Invoice Match Rate</div><div className="t up">▲ +5% vs last qtr</div></div>
                <div className="mk"><div className="v">11d</div><div className="l">Avg. PO Cycle Time</div><div className="t dn">▼ −3d vs last qtr</div></div>
              </div>
              <div className="score">
                <div className="score-top"><span className="s">AI Maturity Score</span><span className="n"><b>72</b> / 100</span></div>
                <div className="track"><div className="fill"></div></div>
                <div className="scale"><span>Initial</span><span>Developing</span><span className="cur">Optimized ▲</span><span>Leading</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
