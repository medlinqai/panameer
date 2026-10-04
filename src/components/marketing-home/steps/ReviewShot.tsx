import { P2P_DOMAINS } from "@/lib/assessment/questions-p2p";

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
            {}
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
