import {
  AlignLeft,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  DollarSign,
  Download,
  FileText,
  LayoutGrid,
  LifeBuoy,
  PenLine,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

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
 * ── ⚠ ICONS ARE COMPONENTS, NOT CHARACTERS ───────────────────────────────────
 *
 * The first pass at this shot used `▦ ◔ ▤ ◈ ⚙` and half of them failed to render
 * on the box — geometric-shape codepoints are missing from most webfonts and fall
 * back per-glyph, so an icon row renders as a row of different-sized boxes.
 *
 * The mockup answered that with an SVG `<defs>` block plus `<use href="#id">`.
 * This uses `lucide-react` instead, which is THE PROJECT'S EXISTING APPROACH
 * (`casing/RailIcon.tsx` maps names to the same package) and is the better fit
 * here for two reasons: `<use href="#i-grid">` puts a dozen global ids into a
 * page that already renders other SVGs, and lucide is imported by name so only
 * the fourteen used are bundled. It carries no `"use client"`, so this stays a
 * Server Component and `/` keeps prerendering with zero JS from these icons.
 *
 * The mockup's filled symbols become lucide's stroked ones — the one deliberate
 * visual deviation, noted so it is not read as drift.
 */

/* ── the rail ─────────────────────────────────────────────────────────────── */
/** First is active — a dashboard, which is the screen being shown. */
const RAIL_GENERAL: LucideIcon[] = [LayoutGrid, BarChart3, AlignLeft, Sparkles, FileText];
const RAIL_SUPPORT: LucideIcon[] = [LifeBuoy, Settings];

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
  { action: "P2P Rogue-Spend Alert", owner: "Panameer", isPartner: false, weeks: "2 weeks", savings: "$610,000" },
  { action: "P2P PO Price Alerts", owner: "Panameer", isPartner: false, weeks: "2 weeks", savings: "$520,000" },
  { action: "Negotiation Alert", owner: "Panameer", isPartner: false, weeks: "4 weeks", savings: "$265,000" },
  {
    action: "P2P Supplier Registration Document Validation Agent",
    owner: "Panameer",
    isPartner: false,
    weeks: "2 weeks",
    savings: "$215,000",
  },
];

function RailTile({ Icon, on = false }: { Icon: LucideIcon; on?: boolean }) {
  return (
    <span className={"osd-ri" + (on ? " is-on" : "")}>
      <Icon className="osd-sv" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export function OptimizationDashboardShot() {
  return (
    <div className="osd">
      {/* browser chrome — decoration, so it is hidden from AT entirely */}
      <div className="osd-chrome" aria-hidden>
        <span className="osd-dot" style={{ background: "#ff5f57" }} />
        <span className="osd-dot" style={{ background: "#febc2e" }} />
        <span className="osd-dot" style={{ background: "#28c840" }} />
        <span className="osd-url" />
      </div>

      <div className="osd-app">
        {/*
          The rail is chrome too — seven unlabelled tiles read to a screen reader
          as seven meaningless stops. The dashboard's CONTENT below stays
          readable, because the figures are the pitch.
        */}
        <div className="osd-rail" aria-hidden>
          <span className="osd-rlogo">
            <LayoutGrid className="osd-sv" strokeWidth={2} aria-hidden />
          </span>
          <span className="osd-rlab">General</span>
          {RAIL_GENERAL.map((Icon, i) => (
            <RailTile Icon={Icon} on={i === 0} key={i} />
          ))}
          <span className="osd-rlab">Support</span>
          {RAIL_SUPPORT.map((Icon, i) => (
            <RailTile Icon={Icon} key={i} />
          ))}
        </div>

        <div className="osd-side">
          <div className="osd-top">
            <div className="osd-search" aria-hidden>
              <Search className="osd-sv" strokeWidth={1.9} aria-hidden />
              <span>Search here…</span>
              {/*
                ⚠ `/` NOT `⌘ K` (E150). U+2318 falls back per-glyph in Montserrat
                — the same failure class as the `▦ ◔ ▤ ◈ ⚙` characters this shot
                already replaced with lucide icons, and it survived only because
                the first brief named it explicitly. `/` is ASCII, renders in every
                font, and is a real search-shortcut convention rather than a
                Mac-only one on a page that is not Mac-only.
              */}
              <span className="osd-kbd">/</span>
            </div>
            <div className="osd-tops">
              <span className="osd-ico" aria-hidden>
                <Bell className="osd-sv" strokeWidth={1.8} aria-hidden />
                <span className="osd-dotr" />
              </span>
              <span className="osd-ico is-mag" aria-hidden>
                <PenLine className="osd-sv" strokeWidth={1.9} aria-hidden />
              </span>
              <div className="osd-who">
                <span className="osd-av" aria-hidden>
                  PI
                </span>
                <span className="osd-whot">
                  <b>Paul Ingrao</b>
                  <span>Ingrao Dental Services</span>
                </span>
              </div>
            </div>
          </div>

          <div className="osd-main">
            <div className="osd-mh">
              <div>
                {/* ⚠ Scott's explicit heading change from "AI Maturity
                    Assessment — Procure-to-Pay". Do not restore the old wording. */}
                <h3 className="osd-h3">Procure-to-Pay Optimization Dashboard</h3>
                {/*
                  ⚠ NO HARDCODED ABSOLUTE DATE IN MARKETING CHROME (E149). This
                  read "Thursday, 30 September 2022" from Scott's source image —
                  four years stale on a page that elsewhere wants to read as live,
                  which makes it look like an abandoned product. An absolute date
                  only ever gets worse and nobody remembers to update it. The
                  replacement also does more work than a date did: it says what the
                  dashboard covers.
                */}
                <p className="osd-date">Procure-to-Pay · all ten capability domains</p>
              </div>
              <div className="osd-mact">
                <span className="osd-pill">
                  <Calendar className="osd-sv" strokeWidth={1.7} aria-hidden />
                  {/* relative, for the same reason as the sub-line above */}
                  Last 30 days
                  {/* the mockup's ▾ (U+25BE) replaced by a drawn chevron — same
                      failing class of glyph as the icons it banned */}
                  <ChevronDown className="osd-cv" strokeWidth={2} aria-hidden />
                </span>
                <span className="osd-pill is-mag">
                  <Download className="osd-sv" strokeWidth={1.9} aria-hidden />
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
                    <BarChart3 className="osd-sv" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="osd-kv">−31 pts</span>
                </div>
                <p className="osd-klab">Your Org Versus Industry</p>
                <p className="osd-knote">42 vs. 73 — industry median for your rung</p>
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
                    <Sparkles className="osd-sv" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="osd-kv">23</span>
                </div>
                <p className="osd-klab">Optimization Opportunities</p>
                <p className="osd-knote">Across 10 capability domains</p>
                <div className="osd-spark" aria-hidden>
                  {SPARK.map((b, i) => (
                    <b className={b.on ? "is-on" : undefined} style={{ height: `${b.h}%` }} key={i} />
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
                    <DollarSign className="osd-sv" strokeWidth={2} aria-hidden />
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
                        <span className={"osd-own" + (f.isPartner ? " is-partner" : "")}>{f.owner}</span>
                      </td>
                      <td>{f.weeks}</td>
                      <td className="is-r">{f.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
