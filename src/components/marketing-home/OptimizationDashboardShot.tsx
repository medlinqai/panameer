import {
  BarChart3,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  Sparkles,
} from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";

/* ── KPI 2's sparkline ────────────────────────────────────────────────────── */
const SPARK: { h: number; on: boolean; n: number }[] = [
  { h: 100, on: true, n: 4 },
  { h: 78, on: true, n: 3 },
  { h: 70, on: true, n: 3 },
  { h: 34, on: false, n: 1 },
  { h: 44, on: false, n: 2 },
  { h: 40, on: false, n: 2 },
  { h: 88, on: true, n: 3 },
  { h: 46, on: false, n: 2 },
  { h: 36, on: false, n: 1 },
  { h: 46, on: false, n: 2 },
];

/* ── KPI 3's stacked bar ──────────────────────────────────────────────────── */
const STACK = [38, 24, 20, 10, 8];

/* ── the findings table ───────────────────────────────────────────────────── */
const FINDINGS: {
  action: string;
  owner: string;
  isPartner: boolean;
  weeks: string;
  savings: string;
}[] = [
  {
    action: "TDWCA — Tax Deferred Working Capital Account",
    owner: "StratERP",
    isPartner: true,
    weeks: "4 weeks",
    savings: "$980,000",
  },
  {
    action: "P2P Rogue-Spend Alert",
    owner: "Panameer",
    isPartner: false,
    weeks: "2 weeks",
    savings: "$610,000",
  },
  {
    action: "P2P PO Price Alerts",
    owner: "Panameer",
    isPartner: false,
    weeks: "2 weeks",
    savings: "$520,000",
  },
  {
    action: "Negotiation Alert",
    owner: "Panameer",
    isPartner: false,
    weeks: "4 weeks",
    savings: "$265,000",
  },
  {
    action: "P2P Supplier Registration Document Validation Agent",
    owner: "Panameer",
    isPartner: false,
    weeks: "2 weeks",
    savings: "$215,000",
  },
];

export function OptimizationDashboardShot() {
  return (
    <div className="osd-wrap">
      <AppShot railActive={0}>
        {}
        <div className="ash-main osd-main">
          <div className="ash-mh">
            <div>
              {}
              <h3 className="ash-h3">Procure-to-Pay Optimization Dashboard</h3>
              {}
              <p className="ash-sub">
                Procure-to-Pay · all ten capability domains
              </p>
            </div>
            <div className="ash-mact">
              <span className="ash-pill">
                <Calendar className="ash-sv" strokeWidth={1.7} aria-hidden />
                {/* relative, for the same reason as the sub-line above */}
                Last 30 days
                {}
                <ChevronDown className="ash-cv" strokeWidth={2} aria-hidden />
              </span>
              <span className="ash-pill is-mag">
                <Download className="ash-sv" strokeWidth={1.9} aria-hidden />
                Export Data
              </span>
            </div>
          </div>

          <div className="osd-kpis">
            {/* ---- KPI 1: the industry gap ------------------------------ */}
            <div className="osd-kpi">
              <span className="osd-info" aria-hidden>
                i
              </span>
              <div className="osd-kt">
                <span className="osd-kico is-a" aria-hidden>
                  <BarChart3 className="ash-sv" strokeWidth={2} aria-hidden />
                </span>
                <span className="osd-kv">−31 pts</span>
              </div>
              <p className="osd-klab">Your Org Versus Industry</p>
              {}
              <p className="osd-knote">
                42 vs. 73 — industry median for your maturity level
              </p>
              <div className="osd-meter">
                <div className="osd-mrow">
                  <span>You 42</span>
                  <span>100</span>
                </div>
                <div className="osd-mtrack">
                  <span className="osd-mfill" style={{ width: "42%" }} />
                  <span className="osd-mmark" style={{ left: "73%" }} />
                </div>
                {}
                <span className="osd-mind" style={{ left: "73%" }}>
                  Industry 73
                </span>
              </div>
            </div>

            {/* ---- KPI 2: the opportunity count ------------------------- */}
            <div className="osd-kpi">
              <span className="osd-info" aria-hidden>
                i
              </span>
              <div className="osd-kt">
                <span className="osd-kico is-b" aria-hidden>
                  <Sparkles className="ash-sv" strokeWidth={2} aria-hidden />
                </span>
                <span className="osd-kv">23</span>
              </div>
              <p className="osd-klab">Optimization Opportunities</p>
              <p className="osd-knote">Across 10 capability domains</p>
              <div className="osd-spark" aria-hidden>
                {SPARK.map((b, i) => (
                  <b
                    className={b.on ? "is-on" : undefined}
                    style={{ height: `${b.h}%` }}
                    key={i}
                  />
                ))}
              </div>
              <div className="osd-slab" aria-hidden>
                {SPARK.map((b, i) => (
                  <span key={i}>{b.n}</span>
                ))}
              </div>
            </div>

            {/* ---- KPI 3: the dollars ---------------------------------- */}
            <div className="osd-kpi">
              <span className="osd-info" aria-hidden>
                i
              </span>
              <div className="osd-kt">
                <span className="osd-kico is-c" aria-hidden>
                  <DollarSign className="ash-sv" strokeWidth={2} aria-hidden />
                </span>
                {/* A BAND, AND THE REASON IS ARITHMETIC */}
                <span className="osd-kv">$1.8M &ndash; $3.2M</span>
              </div>
              <p className="osd-klab">Est. Savings — Rev/Heads</p>
              <p className="osd-knote">14% of $18.5M addressable P2P spend</p>
              <div className="osd-stack" aria-hidden>
                {STACK.map((f, i) => (
                  <i style={{ flex: f }} key={i} />
                ))}
              </div>
              <div className="osd-slegend" aria-hidden>
                <span>TDWCA</span>
                <span>Rogue spend</span>
                <span>5 findings</span>
              </div>
            </div>
          </div>

          <div className="osd-find">
            <div className="osd-fh">
              <h4 className="osd-h4">Optimization Findings</h4>
              <span className="osd-chip">Top 5 by value</span>
            </div>
            <table className="osd-tbl">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Owner</th>
                  <th>Timeframe</th>
                  <th className="is-r">Est. Savings</th>
                </tr>
              </thead>
              <tbody>
                {FINDINGS.map((f) => (
                  <tr key={f.action}>
                    <td>{f.action}</td>
                    <td>
                      <span
                        className={
                          "osd-own" + (f.isPartner ? " is-partner" : "")
                        }
                      >
                        {f.owner}
                      </span>
                    </td>
                    <td>{f.weeks}</td>
                    <td className="is-r">{f.savings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AppShot>

      {/* THE EMAIL IS ON STEP 4, NOT STEP 3, AND THAT WAS RULED ON. Scott */}
      <aside className="osd-mail">
        <div className="osd-mail-from">
          <span className="osd-mail-av" aria-hidden>
            P
          </span>
          <span className="osd-mail-who">
            <b>Panameer</b>
            <span>reports@panameer.com</span>
          </span>
        </div>
        <p className="osd-mail-subj">Your P2P AI Maturity report is ready</p>
        {/* eight; the dashboard directly beside this card says "Across 10 capability */}
        <p className="osd-mail-body">
          We scored every capability domain and ranked the opportunities by the
          dollars running through each one. Your dashboard is live.
        </p>
        {/* THIS PATH DOES NOT MATCH THE APP. Scott's string from his image is */}
        <span className="osd-mail-link">panameer.com/assess/claim/8f2c…</span>
        <p className="osd-mail-foot">
          The link signs you in. No password to set, nothing to install.
        </p>
      </aside>
    </div>
  );
}
