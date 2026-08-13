/**
 * THE PRODUCT-SHOT DASHBOARD — "AI Maturity Dashboard – Ingrao Dental
 * Services LLC" (brief §3), ported exactly as the mockup has it.
 *
 * ⚠ PRESENTATIONAL. Nothing here is wired to data and nothing here is real:
 * the client name, the KPI figures, the chart and the donut are the mockup's
 * sample values. The brief is explicit that sections 3, 7, 8 and 9 still carry
 * StratERP-era placeholder copy and must be built AS-IS — Scott replaces the
 * wording in a later pass. Do not substitute invented Panameer content here.
 *
 * It is inert by construction: no links, no buttons, no inputs. A visitor
 * cannot click something that pretends to work.
 */
export function DashboardShot() {
  return (
    <>
      {/* DASHBOARD PRODUCT SHOT */}
      <section className="hero-dash">
        <div className="wrap">
        <div className="dash-shot">
          <div className="win-bar"><span className="dot r"></span><span className="dot y"></span><span className="dot g"></span><span className="win-url"></span></div>
          <div className="dash">
            <div className="side">
              <div className="ico on"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg></div>
              <div className="cap">GENERAL</div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg></div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg></div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19V5m5 14V9m5 10V13m5 6V7" /></svg></div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l4-4 4 4 6-6" /></svg></div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg></div>
              <div className="cap">SUPPORT</div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .8-1 1.7" /><circle cx="12" cy="16.5" r=".6" fill="currentColor" /></svg></div>
              <div className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.06-.32.1-.66.1-1z" /></svg></div>
            </div>
            <div className="main">
              <div className="topbar">
                <div className="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa2b1" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg> Search here...<span className="kbd">⌘ K</span></div>
                <div className="tb-icons">
                  <span className="bell"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg></span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  <span className="avatar"><span className="av-c">PI</span><span className="av-t"><b>Paul Ingrao</b><span>Admin</span></span></span>
                </div>
              </div>
              <div className="dbody">
                <div className="dbody-head">
                  <div>
                    <h3>AI Maturity Dashboard - Ingrao Dental Services LLC</h3>
                    <div className="date">Thursday, 30 September 2022</div>
                  </div>
                  <div className="dh-right">
                    <span className="pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg> 1 Sep 22 – 30 Sep 22 ▾</span>
                    <span className="pill exp"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" /></svg> Export Data</span>
                  </div>
                </div>
                <div className="kpis">
                  <div className="kpi">
                    <div className="kpi-top">
                      <div className="kpi-ic" style={{ background: 'var(--mag)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
                      <div><span className="val">$32,605.23</span><span className="chg">+83%</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    <div className="lab">Tax Deferred Working Capital</div>
                    <svg className="spark" viewBox="0 0 300 64" preserveAspectRatio="none"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D72CD6" stopOpacity=".28" /><stop offset="1" stopColor="#D72CD6" stopOpacity="0" /></linearGradient></defs><path d="M0,54 L30,48 L60,50 L90,40 L120,44 L150,34 L180,36 L210,24 L240,28 L270,16 L300,10 L300,64 L0,64 Z" fill="url(#g1)" /><path d="M0,54 L30,48 L60,50 L90,40 L120,44 L150,34 L180,36 L210,24 L240,28 L270,16 L300,10" fill="none" stroke="#D72CD6" strokeWidth="2.5" /></svg>
                  </div>
                  <div className="kpi">
                    <div className="kpi-top">
                      <div className="kpi-ic" style={{ background: '#8a2be2' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12a2 2 0 0 0 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></svg></div>
                      <div><span className="val">$24,240.00</span><span className="chg">+12%</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    <div className="lab">AI Adoption Project Spend</div>
                    <svg className="spark" viewBox="0 0 300 64" preserveAspectRatio="none"><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a2be2" stopOpacity=".28" /><stop offset="1" stopColor="#8a2be2" stopOpacity="0" /></linearGradient></defs><path d="M0,44 L30,38 L60,46 L90,34 L120,42 L150,30 L180,38 L210,26 L240,34 L270,22 L300,26 L300,64 L0,64 Z" fill="url(#g2)" /><path d="M0,44 L30,38 L60,46 L90,34 L120,42 L150,30 L180,38 L210,26 L240,34 L270,22 L300,26" fill="none" stroke="#8a2be2" strokeWidth="2.5" /></svg>
                  </div>
                  <div className="kpi">
                    <div className="kpi-top">
                      <div className="kpi-ic" style={{ background: '#4b7bef' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l4-4 4 4 6-6" /><path d="M17 6h4v4" /></svg></div>
                      {/*
                        WS-1 — `$` ADDED. The mockup had this KPI bare while
                        the two beside it carried a symbol, so the same card
                        showed "$32,605.23", "$24,240.00" and "301,873" —
                        which reads as a count of something, not money, under a
                        label that says Savings. Presentational only; the
                        number is the mockup's and is unchanged. All three KPIs
                        on the card now agree.
                      */}
                      <div><span className="val">$301,873</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    <div className="lab">Targeted Total Savings</div>
                    <svg className="spark" viewBox="0 0 300 64" preserveAspectRatio="none"><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4b7bef" stopOpacity=".28" /><stop offset="1" stopColor="#4b7bef" stopOpacity="0" /></linearGradient></defs><path d="M0,56 L40,52 L80,46 L120,44 L160,34 L200,30 L240,20 L300,8 L300,64 L0,64 Z" fill="url(#g3)" /><path d="M0,56 L40,52 L80,46 L120,44 L160,34 L200,30 L240,20 L300,8" fill="none" stroke="#4b7bef" strokeWidth="2.5" /></svg>
                  </div>
                </div>
                <div className="lower">
                  <div className="panel">
                    <div className="panel-head">
                      <h4>Net Monthly Savings</h4>
                      <div className="tools"><span className="pill">⛃ Filter</span><span className="pill">Last Year ▾</span></div>
                    </div>
                    <div className="chart">
                      <div className="yaxis"><span>$50K</span><span>$40K</span><span>$30K</span><span>$20K</span><span>$10K</span><span>$0</span></div>
                      <div className="plot">
                        <div className="glines"><i></i><i></i><i></i><i></i><i></i><i></i></div>
                        <div className="bars">
                          <div className="bar-col"><div className="b" style={{ height: '42%' }}></div><small>Jan</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '30%' }}></div><small>Feb</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '48%' }}></div><small>Mar</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '38%' }}></div><small>Apr</small></div>
                          <div className="bar-col hl"><div className="b" style={{ height: '80%' }}></div><small>May</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '44%' }}></div><small>Jun</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '66%' }}></div><small>Jul</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '34%' }}></div><small>Aug</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '28%' }}></div><small>Sep</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '72%' }}></div><small>Oct</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '46%' }}></div><small>Nov</small></div>
                          <div className="bar-col"><div className="b" style={{ height: '36%' }}></div><small>Dec</small></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="panel donut-wrap">
                    <div className="panel-head" style={{ width: '100%' }}><h4>Savings Progress vs. Plan</h4></div>
                    <svg width="230" height="150" viewBox="0 0 220 140" style={{ marginTop: '10px' }}>
                      <path d="M 22 118 A 88 88 0 0 1 198 118" fill="none" stroke="#eef0f3" strokeWidth="26" pathLength="100" />
                      <path d="M 22 118 A 88 88 0 0 1 198 118" fill="none" stroke="#D72CD6" strokeWidth="26" pathLength="100" strokeDasharray="68 100" strokeDashoffset="0" />
                      <path d="M 22 118 A 88 88 0 0 1 198 118" fill="none" stroke="#8a2be2" strokeWidth="26" pathLength="100" strokeDasharray="20 100" strokeDashoffset="-68" />
                      <path d="M 22 118 A 88 88 0 0 1 198 118" fill="none" stroke="#d7b4ec" strokeWidth="26" pathLength="100" strokeDasharray="12 100" strokeDashoffset="-88" />
                      <text x="110" y="104" textAnchor="middle" fontSize="30" fontWeight="700" fill="#171E3E" fontFamily="Comfortaa">68%</text>
                      <text x="110" y="122" textAnchor="middle" fontSize="11" fill="#7b8496">of Plan Realized</text>
                    </svg>
                    <div className="donut-legend">
                      <div className="lg"><span className="top"><span className="swatch" style={{ background: '#D72CD6' }}></span>Realized</span><b>68%</b></div>
                      <div className="lg"><span className="top"><span className="swatch" style={{ background: '#8a2be2' }}></span>In Progress</span><b>20%</b></div>
                      <div className="lg"><span className="top"><span className="swatch" style={{ background: '#d7b4ec' }}></span>Remaining</span><b>12%</b></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
    </>
  );
}
