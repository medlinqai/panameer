import { OPPORTUNITIES_BY_DOMAIN } from "@/lib/capability-domains";

/**
 * THE PRODUCT SHOT — a Procure-to-Pay AI Maturity Assessment.
 *
 * This is the replacement the original port promised. It used to be the
 * mockup's generic savings dashboard for a dental practice, carried as-is with
 * a note that Scott would rewrite the copy later; brief_home_dashboard_shot
 * (2026-08-14) is that rewrite. The shot now shows the same ARTIFACT a real
 * prospect gets from /assess — process-scoped, not client-scoped.
 *
 * ⚠ STILL PRESENTATIONAL, AND STILL INERT BY CONSTRUCTION. Nothing here is
 * wired to data. There are no links, no buttons, no inputs and no click
 * handlers anywhere in this file — a visitor cannot click something that
 * pretends to work, and the findings panel in particular has no sort controls
 * and no hover states, because a table that looks sortable and is not is worse
 * than a table that plainly is not.
 *
 * ⚠ IT IS NOT THE REAL REPORT. `/assess/r/[token]` renders the actual
 * assessment from real answers. Aligning the two is a separate decision the
 * brief explicitly defers — do not edit one to match the other.
 *
 * The figures are Scott's, agreed 2026-08-14. See FINDINGS below for the one
 * arithmetic invariant this component has to keep.
 */

/**
 * The five findings, descending by value.
 *
 * ⚠ THESE SUM TO EXACTLY $2,590,000, WHICH IS THE "Estimated Savings" KPI.
 * 980,000 + 610,000 + 520,000 + 265,000 + 215,000 = 2,590,000.
 *
 * The tile and the table are two renderings of one number, so changing a row
 * without changing the tile — or the reverse — puts a dashboard on the
 * marketing home whose total does not equal its line items. That is the exact
 * detail a CFO stops on, and it is why the total is DERIVED below rather than
 * typed a second time: the tile reads `TOTAL_SAVINGS`, which is computed from
 * this array, so the two cannot drift.
 */
const FINDINGS = [
  { action: "TDWCA — Tax Deferred Working Capital Account", short: "TDWCA", owner: "StratERP", tf: "4 weeks", savings: 980_000 },
  { action: "P2P Rogue-Spend Alert", short: "Rogue spend", owner: "Panameer", tf: "2 weeks", savings: 610_000 },
  { action: "P2P PO Price Alerts", short: "PO price", owner: "Panameer", tf: "2 weeks", savings: 520_000 },
  { action: "Negotiation Alert", short: "Negotiation", owner: "Panameer", tf: "4 weeks", savings: 265_000 },
  { action: "P2P Supplier Registration Document Validation Agent", short: "Supplier reg", owner: "Panameer", tf: "2 weeks", savings: 215_000 },
] as const;

const TOTAL_SAVINGS = FINDINGS.reduce((n, f) => n + f.savings, 0);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * ⚠ ALL THREE SPARKLINES ARE GONE, and that is the point of this change.
 *
 * Each tile carried a rising area chart implying a trend on a number with no
 * history — this is one assessment at one moment. The worst was tile 1, where a
 * RISING line sat under a −31 point deficit and read as "improving".
 *
 * Each tile now gets a graphic that means what the tile says:
 *   T1  a benchmark track — the gap is a distance you can see
 *   T2  one column per capability domain — where the findings are, not just how many
 *   T3  the five findings drawn to scale — a preview of the table below it
 */

/** T1 — 0→100 rail, filled to `you`, dark marker at `peers`. */
function BenchmarkTrack({ you, peers }: { you: number; peers: number }) {
  const w = 300;
  return (
    <svg className="viz" viewBox="0 0 300 60" role="img"
      aria-label={`Your score ${you} of 100 against a peer median of ${peers}`}>
      <rect x="0" y="20" width={w} height="10" rx="5" fill="#eef0f5" />
      <rect x="0" y="20" width={(w * you) / 100} height="10" rx="5" fill="#D72CD6" />
      <line x1={(w * peers) / 100} y1="12" x2={(w * peers) / 100} y2="38"
        stroke="#171E3E" strokeWidth="2.5" strokeLinecap="round" />
      <text x="0" y="12" fontSize="10.5" fontWeight="700" fill="#171E3E">You {you}</text>
      <text x={(w * peers) / 100} y="52" fontSize="10.5" fontWeight="700" fill="#171E3E"
        textAnchor="middle">Peers {peers}</text>
      <text x={w} y="12" fontSize="10" fill="#9aa2b3" textAnchor="end">100</text>
    </svg>
  );
}

/**
 * T2 — one column per capability domain, in `capability-domains.ts` order.
 * Columns of 3+ take the full purple; the rest a lighter step, so "where the
 * concentration is" is legible before you read a single number.
 */
function DomainColumns({ counts }: { counts: readonly number[] }) {
  const W = 300, gap = 6, bw = (W - gap * (counts.length - 1)) / counts.length;
  const max = Math.max(...counts);
  return (
    <svg className="viz" viewBox="0 0 300 60" role="img"
      aria-label={`Opportunities per capability domain: ${counts.join(", ")}`}>
      {counts.map((v, i) => {
        const h = 8 + (34 * v) / max;
        const x = i * (bw + gap);
        return (
          <g key={i}>
            <rect x={x} y={44 - h} width={bw} height={h} rx="3" fill={v >= 3 ? "#8a2be2" : "#c7a4ee"} />
            <text x={x + bw / 2} y="57" textAnchor="middle" fontSize="9" fill="#9aa2b3">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * T3 — the five findings to scale, DERIVED FROM `FINDINGS`.
 *
 * Same array the table below renders and the same array TOTAL_SAVINGS reduces,
 * so the tile total is visibly the sum of its parts and the three cannot
 * disagree. Darkest blue on the largest segment.
 */
const FINDING_BLUES = ["#4b7bef", "#6a8ff3", "#89a4f6", "#a7b9f9", "#c5cefc"];

function FindingsBar() {
  /*
    Offsets computed UP FRONT rather than accumulated inside the map. A `let x`
    mutated during render is a reassignment after render completes as far as the
    compiler is concerned, and it is also the shape that breaks if React ever
    re-orders or re-runs the callback. A scan is the same arithmetic, stated
    once.
  */
  const segments = FINDINGS.reduce<{ f: (typeof FINDINGS)[number]; x: number; w: number }[]>(
    (acc, f) => {
      const w = ((300 - 8) * f.savings) / TOTAL_SAVINGS;
      const prev = acc[acc.length - 1];
      const x = prev ? prev.x + prev.w + 2 : 0;
      return [...acc, { f, x, w }];
    },
    []
  );

  return (
    <svg className="viz" viewBox="0 0 300 60" role="img"
      aria-label={`Five findings totalling ${usd(TOTAL_SAVINGS)}, drawn to scale`}>
      {segments.map(({ f, x, w }, i) => (
        <g key={f.action}>
          <rect x={x} y="18" width={w} height="14" rx="3" fill={FINDING_BLUES[i]} />
          {/* Only the two largest get a label — the rest have no room. */}
          {i < 2 && <text x={x + 2} y="46" fontSize="9.5" fill="#7b8496">{f.short}</text>}
        </g>
      ))}
      <text x="300" y="12" fontSize="10" fill="#9aa2b3" textAnchor="end">5 findings</text>
    </svg>
  );
}
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
                <div className="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9aa2b1" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></svg> Search here...<span className="kbd">/</span></div>
                <div className="tb-icons">
                  <span className="bell"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg></span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  <span className="avatar"><span className="av-c">PI</span><span className="av-t"><b>Paul Ingrao</b><span>Ingrao Dental Services</span></span></span>
                </div>
              </div>
              <div className="dbody">
                <div className="dbody-head">
                  <div>
                    <h3>AI Maturity Assessment - Procure-to-Pay</h3>
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
                      <div className="kpi-ic" style={{ background: 'var(--mag)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg></div>
                      {/*
                        WS-3 — NO `.chg` PILL. A gap against a peer benchmark
                        has no period-over-period delta to report; "+83%" beside
                        a −31 point gap is a number that cannot mean anything.
                        U+2212 MINUS, not a hyphen — a hyphen next to a figure
                        reads as a dash and sets the wrong column width.
                      */}
                      <div><span className="val">&#8722;31 pts</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    <div className="lab">Your Org Versus Peers</div>
                    <div className="sub">42 vs. 73 — best-practice ERP peer median</div>
                    <BenchmarkTrack you={42} peers={73} />
                  </div>
                  <div className="kpi">
                    <div className="kpi-top">
                      <div className="kpi-ic" style={{ background: '#8a2be2' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9z" /><path d="m9 13 2 2 4-4" /></svg></div>
                      {/*
                        WS-4 — a COUNT, so no currency symbol and no `.chg`.
                        23 findings across all ten capability domains; the list
                        itself is deliberately not here, because the list is the
                        sales conversation.
                      */}
                      <div><span className="val">23</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    <div className="lab">Optimization Opportunities</div>
                    <div className="sub">Across 10 capability domains</div>
                    <DomainColumns counts={OPPORTUNITIES_BY_DOMAIN} />
                  </div>
                  <div className="kpi">
                    <div className="kpi-top">
                      <div className="kpi-ic" style={{ background: '#4b7bef' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
                      {/*
                        WS-5 — DERIVED FROM THE TABLE, never typed. This is the
                        sum of the five findings below; see the FINDINGS
                        comment. The basis is addressable P2P SPEND, not
                        revenue (decided 2026-08-14).
                      */}
                      <div><span className="val">{usd(TOTAL_SAVINGS)}</span></div>
                      <span className="kpi-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" fill="currentColor" /></svg></span>
                    </div>
                    {/*
                      E105 — SHORTENED TWICE, AND THIS IS THE ONE THAT CLOSES IT.

                      "Estimated Savings Based on Rev/Heads" needed a 332px tile
                      and the tile maxes at 322px, so it wrapped at every width.
                      "Est. Savings Based on Rev/Heads" needed 245px against a
                      196-229px label box between 920 and 1075, so it still
                      wrapped in that band. This reads 187px and fits from 920 up
                      — measured, with the table in the brief's report.

                      The extra line mattered because it made this tile's label
                      block taller than T1's and T2's and knocked the three
                      sub-lines and graphics out of alignment. Shortened rather
                      than restyled: dropping the tracking or the size here would
                      make one tile's label differ from the other two, which is
                      the same misalignment by another route. `white-space:nowrap`
                      was the other candidate and is worse — it trades wrapping
                      for overflow at any width narrower than the label.

                      ⚠ The em dash is spaced and is a real em dash, not a hyphen.
                    */}
                    <div className="lab">Est. Savings — Rev/Heads</div>
                    <div className="sub">14% of $18.5M addressable P2P spend</div>
                    <FindingsBar />
                  </div>
                </div>
                {/*
                  WS-6 — ONE findings panel replaces BOTH old panels (the Net
                  Monthly Savings bar chart and the Savings-vs-Plan donut). Both
                  were deleted rather than hidden: they showed realised progress
                  against a plan, which is a story an assessment has not earned
                  yet — the assessment produces the plan.

                  A real <table> because this is tabular data. `.ftable` gets
                  the per-row decorative wash; see home.css for why it is on a
                  ::before rather than on the text.
                */}
                <div className="panel findings">
                  <div className="panel-head">
                    <h4>Optimization Findings</h4>
                    {/* A NOTE, not a control — no pill.exp, no pointer, no tools row. */}
                    <span className="note">Top 5 by value</span>
                  </div>
                  <table className="ftable">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Owner</th>
                        <th className="tf">Timeframe</th>
                        <th className="num">Est. Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FINDINGS.map((f) => (
                        <tr key={f.action}>
                          <td className="act">{f.action}</td>
                          <td>
                            <span className={"owner" + (f.owner === "StratERP" ? " se" : "")}>
                              {f.owner}
                            </span>
                          </td>
                          <td className="tf">{f.tf}</td>
                          <td className="num">{usd(f.savings)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
