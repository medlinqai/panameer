import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

/**
 * STEP 4 GRAPHIC — what you actually see when you log in. The product shot.
 *
 * ── ⚠ THIS IS NOT A SECOND COPY OF `DashboardShot` ───────────────────────────
 *
 * The brief calls for "the real dashboard, full width… the product shot". The
 * page already renders `DashboardShot` at position 2, and rendering that same
 * component again 3000px lower would put the identical ~500-node dashboard on
 * the page twice — the same picture, twice, illustrating a different claim.
 *
 * So this is drawn to the shape of the REAL logged-in report,
 * `/assess/r/[token]` (`ReportDashboard`): four money tiles across the top,
 * "Your highest-impact moves" ranked beneath, and the savings-progress donut at
 * 0%. That is literally what step 4 promises you will see, and it is a
 * different artefact from the marketing dashboard above — which says so itself
 * ("⚠ IT IS NOT THE REAL REPORT"). Reported rather than assumed.
 *
 * ── THE DONUT IS 0% AND STAYS 0% ─────────────────────────────────────────────
 *
 * `ReportDashboard` draws a fresh report's progress ring at zero on purpose:
 * nothing has been delivered yet, and a seeded 12% would be the fake-live the
 * rails forbid. A marketing shot that showed 40% would be advertising a number
 * the product deliberately refuses to invent.
 *
 * Inert by construction: no links, buttons, inputs or handlers.
 */

/** Ranked by dollars, which is the report's own ordering rule — not by how far
 *  behind the domain is. Illustrative figures, like every number in
 *  `DashboardShot`; the ranks and the domain names come from the real bank. */
const MOVES = [
  { domain: P2P_DOMAINS[5], move: "Auto-match invoices to POs & receipts", value: "$18K–29K" },
  { domain: P2P_DOMAINS[1], move: "Put negotiated pricing in front of the buyer", value: "$9K–14K" },
  { domain: P2P_DOMAINS[0], move: "One request form, routed on its own", value: "$4K–7K" },
];

const TILES = [
  { label: "Yr-1 Funding Available", value: "$0–18K", accent: true },
  { label: "Opportunity on the Table", value: "$29K–47K" },
  { label: "Est. Investment", value: "$16K–20K" },
  { label: "Net, Year 1", value: "Positive" },
];

export function ReviewShot() {
  return (
    <div className="rvs">
      <div className="rvs-win" aria-hidden>
        <span className="rvs-dot r" />
        <span className="rvs-dot y" />
        <span className="rvs-dot g" />
        <span className="rvs-url">panameer.com/assess/r/8f2c&hellip;</span>
      </div>

      <div className="rvs-body">
        <div className="rvs-eyebrow">Meridian Dental Group &middot; Procurement</div>
        <div className="rvs-h1">Here&rsquo;s what&rsquo;s on the table.</div>

        <div className="rvs-tiles">
          {TILES.map((t) => (
            <div
              key={t.label}
              className={"rvs-tile" + (t.accent ? " is-accent" : "")}
            >
              <span className="rvs-tl">{t.label}</span>
              <span className="rvs-tv">{t.value}</span>
            </div>
          ))}
        </div>

        <div className="rvs-cols">
          <div className="rvs-moves">
            <div className="rvs-h2">Your highest-impact moves</div>
            <p className="rvs-sub">
              Ranked by the dollars running through each area, not by how far
              behind it is.
            </p>
            {MOVES.map((m, i) => (
              <div className="rvs-move" key={m.domain.key}>
                <span className="rvs-rank">{i + 1}</span>
                <span className="rvs-mtext">
                  <span className="rvs-mt">{m.move}</span>
                  <span className="rvs-md">{m.domain.name}</span>
                </span>
                <span className="rvs-mv">{m.value}</span>
              </div>
            ))}
          </div>

          <div className="rvs-prog">
            <div className="rvs-h3">Savings progress vs plan</div>
            {/*
              A REAL RING AT ZERO, drawn the way the report draws it. The empty
              ring is the point: this is the plan, and the tracker fills it in
              as work lands.
            */}
            <svg className="rvs-donut" viewBox="0 0 120 120" role="img" aria-label="Savings progress: 0 percent">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#e6e9ef" strokeWidth="14" />
            </svg>
            <div className="rvs-pct">0%</div>
            <div className="rvs-pnote">delivered so far</div>
          </div>
        </div>
      </div>
    </div>
  );
}
