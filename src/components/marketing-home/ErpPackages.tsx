import Link from "next/link";

/**
 * "Use AI to Extend the Value of Your ERP" (WS-3, brief_home_polish_v2).
 *
 * ── THESE ARE EXAMPLES AND THE PAGE SAYS SO ──────────────────────────────────
 *
 * The locked SURFACE INTENT is that the public surface shows EXAMPLES, never
 * fake-live listings. So there is no provider name on a card, no price, no
 * rating, no "3 available" count — nothing that would make an invented package
 * look like a real one somebody could buy. The eyebrow reads "Example
 * packages" and the line under the heading says it again in a sentence, because
 * an eyebrow is the part people skip.
 *
 * That constraint is what shapes the card: an icon, a name, and one line of
 * what it does. When real provider packages exist they replace this array and
 * the card grows the fields a real listing needs.
 *
 * The four methods are Scott's, verbatim from the brief — deploy reports,
 * check prices, validate documents, add full application functionality — with
 * his "to name just a few" kept as the closing line rather than dropped, since
 * it is the honest scope of a four-item list.
 *
 * ── PINK IS THE ICON, NOT THE CARD ───────────────────────────────────────────
 *
 * Per the 2026-08-13 design rule. The icons are magenta strokes on a 10%-tint
 * square; the cards themselves are white on the light section. The section CTA
 * is the one filled magenta element and it is a CTA, which is what the rule
 * reserves the fill for.
 */

type Example = {
  name: string;
  desc: string;
  icon: React.ReactNode;
};

/* 20px stroke icons, matching the mockup's `.tab` / `.side` glyph weight. */
const EXAMPLES: Example[] = [
  {
    name: "Deploy reports",
    desc: "Ship the operational reports your ERP never came with — built against your own data model, live in days.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 15l3.5-4 3 2.5L20 7" />
      </svg>
    ),
  },
  {
    name: "Check prices",
    desc: "Catch price and contract variances on the purchase order before it is approved, not in the quarterly review.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22" />
        <path d="M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    name: "Validate documents",
    desc: "Read invoices, contracts and statements as they arrive, match them to the record, and flag what does not agree.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: "Add application functionality",
    desc: "Whole capabilities the standard product does not have, added alongside it — without a re-implementation.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M17.5 14.5v6M14.5 17.5h6" />
      </svg>
    ),
  },
];

export function ErpPackages() {
  return (
    <section className="erp">
      <div className="wrap">
        <div className="erp-head">
          <div className="eyebrow">Example packages</div>
          <h2>
            Use AI to Extend the Value of Your ERP
            <br />
            &mdash; immediately, and for less.
          </h2>
          <p>
            Panameer providers sell packaged AI solutions that plug into the ERP
            you already run &mdash; so value arrives in days, not quarters. The
            four below are <strong>examples of the kind of work providers
            package</strong>, not live listings.
          </p>
        </div>

        <div className="erp-grid">
          {EXAMPLES.map((e) => (
            <article key={e.name} className="erp-card">
              <span aria-hidden className="erp-ico">
                {e.icon}
              </span>
              <h3>{e.name}</h3>
              <p>{e.desc}</p>
            </article>
          ))}
        </div>

        <div className="erp-foot">
          {/* Scott's own framing, kept: a four-item list is not the catalogue. */}
          <p>&mdash; to name just a few.</p>
          <Link className="btn btn-solid" href="/services">
            Explore packages &rsaquo;
          </Link>
        </div>
      </div>
    </section>
  );
}
