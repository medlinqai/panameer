"use client";

import { useState } from "react";
import Link from "next/link";
import { Lightbox } from "@/components/marketing-home/Lightbox";
import { DecorativeSceneProvider } from "@/components/marketing-home/scenes/decorative";
import { SpendOverviewScene } from "@/components/marketing-home/scenes/SpendOverviewScene";
import { PriceAlertScene } from "@/components/marketing-home/scenes/PriceAlertScene";
import { W9Scene } from "@/components/marketing-home/scenes/W9Scene";
import { WorkRequestScene } from "@/components/marketing-home/scenes/WorkRequestScene";

type Example = {
  name: string;
  desc: string;
  /** The link text differs per card so it names what opens. */
  open: string;
  /** Dialog accessible name. */
  label: string;
  tf: string;
  scene: React.ReactNode;
};

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
          {}
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
              {}
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
          {}
          <p>&mdash; to name just a few.</p>
          {}
          <Link className="btn btn-solid" href="/marketplace">
            Explore Service Products &rsaquo;
          </Link>
        </div>
      </div>

      {}
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
