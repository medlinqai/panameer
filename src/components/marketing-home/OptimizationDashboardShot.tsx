import {
  BarChart3,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  Sparkles,
} from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";

/**
 * STEP 4's GRAPHIC — the Optimization Dashboard, drawn as a browser shot.
 *
 * A COMPONENT, NOT A PNG, for the same reason `SubmitToAI` is: the figures ARE
 * the pitch and they will change. A screenshot would freeze $2,590,000 and the
 * five findings into a bitmap, and it would not survive a theme or a retina.
 *
 * ── ⚠ THIS IS A RENDERING OF A PRODUCT SCREEN, NOT THE PRODUCT SCREEN ────────
 *
 * It imports NOTHING from the real assessment — not `ReportDashboard`, not the
 * scoring lib, not a query. Every number below is statically authored marketing
 * art. Two reasons that separation is deliberate and not laziness:
 *
 *   1. `/` prerenders static (○). Reaching into the report path would drag a
 *      data dependency onto a page that has no session and no assessment id.
 *   2. The real dashboard will move — it is a product surface under active
 *      change. A marketing drawing that tracked it would break on every commit
 *      to it, and a marketing drawing that lagged it would be a lie either way.
 *      Drawn art is honestly a drawing.
 *
 * ── ⚠ "INDUSTRY", NEVER "PEERS" ──────────────────────────────────────────────
 *
 * The first mockup said *Your Org Versus Peers* and *best-practice ERP peer
 * median*. "Peers" asserts a surveyed comparison pool that does not exist;
 * `spine-steps.ts` step 4 already carries the same correction in its title, and
 * Scott struck the word once before it crept back. The benchmark is derived from
 * the maturity ladder — industry sits at rung 37 -> 67.5, adjusted per domain —
 * so INDUSTRY is what it is. The CSS class is `osd-mind`, not `osd-mpeer`, on
 * purpose: the word should not be able to creep back in through a selector.
 * Restoring "peers" is Scott's call and a counsel-gate item.
 *
 * ── ⚠ EVERY DOLLAR FIGURE IN HERE IS A PUBLIC PRODUCT CLAIM ──────────────────
 *
 * $2,590,000, the $18.5M addressable base, the five per-finding amounts and the
 * industry median of 73 all sit on a pre-account page. They join the counsel-gate
 * list with the tax-savings copy, the Oracle mark, the AIP and the rung-4 agent
 * names. Not a blocker for building it — a blocker for LAUNCHING it.
 *
 * ── THE SHELL LIVES IN `AppShot`, NOT HERE ───────────────────────────────────
 *
 * The browser frame, the 64px rail and the top bar were extracted at E145/E146,
 * when steps 2 and 5 needed the same three. This file owns the dashboard BODY and
 * nothing else; `railActive={0}` is all it says about the rail. The icon rationale
 * (lucide rather than the mockups' `<defs>` + `<use>`, and why never a text glyph)
 * moved there with it.
 */

/* ── KPI 2's sparkline ────────────────────────────────────────────────────── */
/**
 * Ten bars for the ten P2P capability domains, four highlighted. `n` is the
 * count printed beneath the bar and is the labelled figure; `h` is only the bar
 * height, which the mockup drew for shape rather than to scale.
 *
 * ⚠ THESE TEN MUST SUM TO THE KPI ABOVE THEM (E148). They shipped summing to 22
 * under a KPI reading 23. The tenth was raised 1 -> 2 rather than dropping the KPI
 * to 22, for two reasons:
 *
 *   - `23` is also quoted by Step 5 ("Built from 23 optimization opportunities"),
 *     so lowering the KPI would have moved the defect to a second graphic.
 *   - The tenth is Change Management & AI Adoption, which scores 25 — the LOWEST
 *     of the ten in `capability-domains.ts`. The worst-scoring domain having the
 *     fewest opportunities was backwards, so the arithmetic and the internal
 *     logic were wrong in the same place and are fixed in the same move.
 *
 * Its bar went 28% -> 46% with it, because a bar that disagrees with its own
 * printed label is the defect this was.
 */
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
/**
 * The five findings as a share of $2,590,000 — 980/610/520/265/215 rounds to
 * exactly these, which is why the segments sum to 100.
 */
const STACK = [38, 24, 20, 10, 8];

/* ── the findings table ───────────────────────────────────────────────────── */
/**
 * ⚠ THE OWNER COLUMN'S TWO-TONE IS THE POINT OF THE COLUMN. One finding is
 * somebody else's product (StratERP, amber) and four are ours (Panameer, grey).
 * A single chip colour would make the column decorative. `isPartner` drives it
 * rather than a hard-coded class per row.
 */
const FINDINGS: {
  action: string;
  owner: string;
  isPartner: boolean;
  weeks: string;
  savings: string;
}[] = [
  {
    /**
     * ⚠ TDWCA IS GATED ON A LAWYER AND A CPA, AND IT IS HERE BY EXPLICIT
     * INSTRUCTION. `brief_home_steps_spine` barred this row from the savings
     * section for exactly that reason; `brief_step4_dashboard_graphic` puts it in
     * the findings table by name and routes it to the counsel gate instead. Both
     * are Scott's, the second is later and more specific, so it wins — but this
     * is the one string in the shot that a reviewer should expect to be told to
     * strike. Removing it means this row and the `TDWCA` legend label below.
     */
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
    /*
      ⚠ THE SHELL IS `AppShot`, NOT A COPY OF IT. Steps 2, 4 and 5 draw the same
      browser frame, rail and top bar; this shot owns only the dashboard BODY
      below. `railActive={0}` is the dashboard tile — the screen being shown.
    */
    /*
      ⚠ THE WRAPPER EXISTS BECAUSE `.ash` IS `overflow:hidden`. The email card has
      to hang OUTSIDE the browser frame's bottom-left corner, and anything
      absolutely positioned inside `.ash` gets clipped by the same rule that keeps
      the frame's 14px radius honest. So the card is a SIBLING of the frame inside a
      positioned wrapper, not a child of it. Do not "simplify" this by moving the
      card inside `AppShot` — it will silently vanish below the fold of the frame.
    */
    <div className="osd-wrap">
      <AppShot railActive={0}>
        {/*
          ⚠ `osd-main` IS A STEP-4-ONLY MODIFIER AND IT IS LOAD-BEARING. `ash-main`
          is shared by steps 2, 4 and 5, so the deep bottom padding that gives the
          email card blank canvas to overlap CANNOT go there — it would put 92px of
          dead space under the wizard and the roadmap too.
        */}
        <div className="ash-main osd-main">
          <div className="ash-mh">
            <div>
              {/* ⚠ Scott's explicit heading change from "AI Maturity
                Assessment — Procure-to-Pay". Do not restore the old wording. */}
              <h3 className="ash-h3">Procure-to-Pay Optimization Dashboard</h3>
              {/*
              ⚠ NO HARDCODED ABSOLUTE DATE IN MARKETING CHROME (E149). This
              read "Thursday, 30 September 2022" from Scott's source image —
              four years stale on a page that elsewhere wants to read as live,
              which makes it look like an abandoned product. An absolute date
              only ever gets worse and nobody remembers to update it. The
              replacement also does more work than a date did: it says what the
              dashboard covers.
            */}
              <p className="ash-sub">
                Procure-to-Pay · all ten capability domains
              </p>
            </div>
            <div className="ash-mact">
              <span className="ash-pill">
                <Calendar className="ash-sv" strokeWidth={1.7} aria-hidden />
                {/* relative, for the same reason as the sub-line above */}
                Last 30 days
                {/* the mockup's ▾ (U+25BE) replaced by a drawn chevron — same
                  failing class of glyph as the icons it banned */}
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
              <p className="osd-knote">
                42 vs. 73 — industry median for your rung
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
                {/* `osd-mind` — see the note at the top of this file on why
                  this is not called `osd-mpeer`. */}
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
                <span className="osd-kv">$2,590,000</span>
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

      {/*
        ⚠ THE EMAIL IS ON STEP 4, NOT STEP 3, AND THAT WAS RULED ON. Scott
        considered step 3, chat built it there, and he reversed it: "dont add the
        email to the step 3 graphic...add it to the step 4 graphic like this." The
        Step 3 funnel is untouched.

        ⚠ NOTHING IN THE DASHBOARD MAY BE OBSCURED. Scott: "dont want to obscure the
        numbers or the text for the highest value savings number (TDWCA)." The fix is
        NOT to slide the card off the frame — it is to give the frame blank canvas to
        be overlapped, which is what `osd-main`'s 118px bottom padding is for. The
        overlapping portion lands entirely in that empty band below the findings
        table. Asserted by intersection test against every td, th, KPI value, label,
        note, heading and pill at eight widths, not by eye.

        ⚠ IT IMPLIES AN EMAIL THAT DOES NOT SEND YET — `RESEND_API_KEY` is commented
        out and the share token currently comes back in the `POST /api/assessment`
        response rather than by mail. Counsel-gate item, not a build blocker.
      */}
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
        {/*
          ⚠ "every capability domain", NOT "all eight". Scott's reference image said
          eight; the dashboard directly beside this card says "Across 10 capability
          domains" and "Procure-to-Pay · all ten capability domains". Eight against
          ten inside one frame would show a visitor the gap between what the bank
          measures (8) and what the page advertises (10). "Every" is true either way
          and does not require resolving that gap here.
        */}
        <p className="osd-mail-body">
          We scored every capability domain and ranked the opportunities by the
          dollars running through each one. Your dashboard is live.
        </p>
        {/*
          ⚠ THIS PATH DOES NOT MATCH THE APP. Scott's string from his image is
          `/assess/claim/`; the real route is `/assess/r/<token>`. Shipping his, and
          flagged in the report so he can decide which one moves.
        */}
        <span className="osd-mail-link">panameer.com/assess/claim/8f2c…</span>
        <p className="osd-mail-foot">
          The link signs you in. No password to set, nothing to install.
        </p>
      </aside>
    </div>
  );
}
