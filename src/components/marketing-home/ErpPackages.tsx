"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbox } from "@/components/marketing-home/Lightbox";
import { DecorativeSceneProvider } from "@/components/marketing-home/scenes/decorative";
import { SpendOverviewScene } from "@/components/marketing-home/scenes/SpendOverviewScene";
import { PriceAlertScene } from "@/components/marketing-home/scenes/PriceAlertScene";
import { W9Scene } from "@/components/marketing-home/scenes/W9Scene";
import { WorkRequestScene } from "@/components/marketing-home/scenes/WorkRequestScene";

/**
 * "Use AI to Extend the Value of Your ERP" (WS-3, brief_home_polish_v2).
 *
 * ── THE INTENT IS NARROWED, NOT REVOKED (WS-1, 2026-08-14) ───────────────────
 *
 * This used to be a teaser of sample LISTINGS, and it carried a sentence saying
 * so. The tiles are now AGENT CATEGORIES — "Price Alerts", "Document
 * Validation" — which is a claim about what Panameer providers build, not a
 * pretend inventory, so the "these are examples, not live listings" sentence is
 * gone with it.
 *
 * ⚠ WHAT DID NOT CHANGE: no card carries a provider name, a price, a rating or
 * an availability count. That is still the line, and it is the reason a
 * category tile cannot be mistaken for something purchasable. When real
 * provider packages exist they replace this array and the card grows the fields
 * a real listing needs.
 *
 * Naming Oracle in the headline is deliberate — the locked Oracle-as-wedge
 * positioning. Do not genericise it to "your ERP".
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
  /** The link text differs per card so it names what opens. */
  open: string;
  /** Dialog accessible name. */
  label: string;
  /**
   * ⚠ A CROP OF THE SCENE AT TRUE SCALE, not a shrunk screenshot.
   *
   * A card is ~250px and these scenes are 660–920px; scaling one to fit
   * produces unreadable mush. The transform frames a readable REGION and the
   * crop box clips the rest, so what you see in the card is the same pixels you
   * get in the lightbox.
   */
  tf: string;
  scene: React.ReactNode;
};

/**
 * The four doorways. Descriptions are unchanged from E086; each card now opens
 * its scene.
 *
 * ⚠ CARD 1'S CROP FRAMES "Spend by category" — the brief's default. The KPI
 * strip is the alternative (literal top-left, so opening reads as a cleaner
 * zoom-out) and switching is this one transform.
 */
const EXAMPLES: Example[] = [
  {
    name: "Reports & Dashboards",
    desc: "Ship the operational reports your ERP never came with — built against your own data model, live in days.",
    open: "View the dashboard ›",
    label: "Spend Overview dashboard",
    tf: "scale(.62) translate(-192px,-128px)",
    scene: <SpendOverviewScene />,
  },
  {
    name: "Price Alerts",
    desc: "Catch price and contract variances on the purchase order before it is approved, not in the quarterly review.",
    open: "See the alert ›",
    label: "Price alert email",
    tf: "scale(.42) translate(-8px,-150px)",
    scene: <PriceAlertScene />,
  },
  {
    name: "Document Validation",
    desc: "Read invoices, contracts and statements as they arrive, match them to the record, and flag what does not agree.",
    open: "See the validation ›",
    label: "W-9 document validation",
    /*
      RETUNED from the mockup's -300/-96. That framing was measured against the
      mockup's own layout; this port renders the checks pane at x=320,y=206, so
      the original transform landed on empty document margin. Frames the status
      band and the first checks — the part that carries the argument.
    */
    tf: "scale(.46) translate(-318px,-180px)",
    scene: <W9Scene />,
  },
  {
    name: "Extend Your Apps",
    desc: "Whole capabilities the standard product does not have, added alongside it — without a re-implementation.",
    open: "See the matches ›",
    label: "Work request with matched experts",
    tf: "scale(.44) translate(-330px,-96px)",
    scene: <WorkRequestScene />,
  },
];

export function ErpPackages() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const active = openIdx === null ? null : EXAMPLES[openIdx];

  return (
    <section className="erp">
      <div className="wrap">
        <div className="erp-head">
          <div className="eyebrow">Pre-Defined Services</div>
          {/* Break after "Manage Risk" so the two lines balance (WS-1). */}
          {/* WS-2 (E101) — supersedes E085. Break after "Less Risk". */}
          <h2>
            Deploy Faster and with Less Risk
            <br />
            by Using Pre-Built AI Agents for Oracle Applications
          </h2>
          <p>
            Panameer providers sell packaged AI solutions that plug into the ERP
            you already run &mdash; so value arrives in days, not quarters.
          </p>
        </div>

        <div className="erp-grid">
          {EXAMPLES.map((e, i) => (
            <button
              type="button"
              key={e.name}
              className="erp-card door"
              /* A real button: opens on click, tap, Enter and Space. */
              aria-haspopup="dialog"
              style={{ ["--tf" as string]: e.tf }}
              onClick={() => setOpenIdx(i)}
            >
              {/*
                ⚠ NOTHING INSIDE THE CROP IS INTERACTIVE. The card is a real
                <button>, and HTML forbids an interactive descendant of one —
                React refuses to hydrate a nested <button>, and the nested
                control would eat the Enter/Space that opens this card. The
                provider tells the scene it is the crop; see `scenes/decorative`.
              */}
              <span className="crop" aria-hidden>
                <DecorativeSceneProvider value={true}>
                  <span className="crop-inner" style={{ transform: e.tf }}>
                    {e.scene}
                  </span>
                </DecorativeSceneProvider>
              </span>
              <span className="db">
                <span className="db-h3">{e.name}</span>
                <span className="db-p">{e.desc}</span>
                <span className="db-open">{e.open}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="erp-foot">
          {/* Scott's own framing, kept: a four-item list is not the catalogue. */}
          <p>&mdash; to name just a few.</p>
          <Link className="btn btn-solid" href="/buy-services">
            Explore Packages &rsaquo;
          </Link>
        </div>
      </div>

      {/*
        ONE dialog, whichever card opened it. `Lightbox` captures the opening
        element and refocuses it on close — unmounting alone would drop focus to
        <body>. Verified in the browser, not assumed.
      */}
      <Lightbox
        open={active !== null}
        label={active?.label ?? ""}
        onClose={() => setOpenIdx(null)}
      >
        {active?.scene}
      </Lightbox>
    </section>
  );
}
