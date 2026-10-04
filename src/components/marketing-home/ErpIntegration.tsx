"use client";

import { useState } from "react";
import { BRAND_ERP_TAGLINE } from "@/lib/brand";
import { Lightbox } from "@/components/marketing-home/Lightbox";
import { DecorativeSceneProvider } from "@/components/marketing-home/scenes/decorative";
import { FulfillmentScene } from "@/components/marketing-home/scenes/FulfillmentScene";
import { SettlementScene } from "@/components/marketing-home/scenes/SettlementScene";
import { ASSESSMENT_PRODUCT } from "@/lib/brand";

/* ── the overview diagram ─────────────────────────────────────────────────── */

const ERP_DOCS: readonly string[] = [
  "Purchase Agreement",
  "Purchase Requisition",
  "Purchase Order",
  "Purchase Order Acknowledge",
  "Invoice",
  "Payment",
];

const PANAMEER_OBJECTS: readonly { name: string; qualifier?: string }[] = [
  { name: ASSESSMENT_PRODUCT },
  { name: "Project Timeline Tracker" },
  { name: "Work Request" },
  { name: "Invitation to Propose" },
  { name: "Service Package" },
  { name: "Offer for Service Package" },
  { name: "Work Order" },
  { name: "Settlement", qualifier: "(Hours/Amount/Milestone)" },
  { name: "Payment" },
];

const RAILS: readonly { name: string; out: boolean; caption: string }[] = [
  { name: "POSR", out: true, caption: "Requisition punches out to Panameer" },
  { name: "Return Cart", out: false, caption: "Accepted rate returns as a req line" },
  { name: "POOM", out: true, caption: "Purchase order out to the provider" },
  { name: "cXML Invoice", out: false, caption: "Invoice back, matched to the PO" },
  { name: "EFT Payment", out: true, caption: "Payment out, settled to the provider" },
];

/* ── the two doorways ─────────────────────────────────────────────────────── */

type Door = {
  name: string;
  desc: string;
  /** Dialog accessible name. */
  label: string;
  tf: string;
  scene: React.ReactNode;
};

const DOORS: readonly Door[] = [
  {
    name: "Fulfillment",
    desc: "Requisition to released work order — every hand-off between the requester, Oracle, Panameer and the provider.",
    label: "Service procurement fulfillment flow",
    tf: "translate(-286px,-166px)",
    scene: <FulfillmentScene />,
  },
  {
    name: "Settlement",
    desc: "From work delivered to money moved — approved settlement writes the receipt, the ERS invoice and the payment.",
    label: "Service procurement settlement flow",
    tf: "translate(-286px,-262px)",
    scene: <SettlementScene />,
  },
];

/* ── what it costs ────────────────────────────────────────────────────────── */

const COSTS: readonly { row: string; body: React.ReactNode }[] = [
  {
    row: "Connecting",
    body: (
      <>
        <span className="erpx-free">Free.</span> Integrating your ERP to
        Panameer costs nothing — no setup fee, no licence, no minimum.
        Connection is not the product.
      </>
    ),
  },
  {
    row: "Buying services",
    body: (
      <>
        Provider fees are billed to the <b>provider</b>, not to you. Nothing
        changes on your side of the ledger.
      </>
    ),
  },
  {
    row: "Using it as a hub",
    body: (
      <>
        If you send transactions across the connection — purchase orders
        out, invoices back, the way you would over a business network —
        those carry a <b>per-transaction fee</b>. You are outsourcing
        ERP-to-ERP communication, and that is the part that has a cost.
      </>
    ),
  },
];

export function ErpIntegration({ className }: { className?: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const active = openIdx === null ? null : DOORS[openIdx];

  return (
    <section className={className ? `erpx ${className}` : "erpx"}>
      <div className="wrap">
        <div className="eyebrow">ERP Integration</div>
        <h2 className="erpx-h2">Integrate Seamlessly — with the Click of a Button</h2>
        {/*
          FROM `brand.ts`, NEVER TYPED HERE. It is a positioning line, the same
          class as BRAND_BADGE, and the Enterprise page will render it too — a
          second copy is how two surfaces come to disagree.
        */}
        <p className="erpx-tagline">{BRAND_ERP_TAGLINE}</p>
        <p className="erpx-lead">
          Organizations spend <b>millions</b> on ERPs and still email PDFs back
          and forth — or run OCR to rip data out of an image that was
          structured data before somebody printed it. Both ends already hold the
          real thing. <b>Panameer moves the native data.</b> If you run Oracle,
          think OBN — only easy.
        </p>

        {/* ── overview diagram ───────────────────────────────────────────── */}
        <div className="erpx-diag">
          <div className="erpx-dhead">
            <h3>Single-click total integration</h3>
            <span className="erpx-tag">BOTH DIRECTIONS</span>
          </div>

          <div className="erpx-rows">
            <div className="erpx-side">
              <div className="erpx-sh">Your system of record</div>
              {/* ⚠ TEXT, NOT A LOGO. Trademark — see the file header. */}
              <div className="erpx-sn">Oracle Cloud ERP</div>
              {/*
                ⚠ THE STACK IS ITS OWN FLEX CHILD so it can distribute. Six
                documents against nine objects left this card visibly empty at
                the bottom; `space-between` on the stack spreads them down the
                full height, which is what slide 2 does. Without this wrapper
                there is nothing to give `flex:1` to.
              */}
              <div className="erpx-docs">
                {ERP_DOCS.map((d) => (
                  <div className="erpx-doc" key={d}>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            <div className="erpx-rails">
              {RAILS.map((r) => (
                <div className={`erpx-rail ${r.out ? "out" : "back"}`} key={r.name}>
                  <div className="erpx-lb">{r.name}</div>
                  {/*
                    The line and its arrowhead are drawn in CSS (::before /
                    ::after on `.erpx-ln`), so the direction is carried by the
                    `out`/`back` class rather than by a character that a screen
                    reader would try to pronounce. The caption states the
                    direction in words for everyone.
                  */}
                  <div className="erpx-ln" aria-hidden />
                  <div className="erpx-dir">{r.caption}</div>
                </div>
              ))}
            </div>

            <div className="erpx-pan">
              <div className="erpx-sh">The marketplace</div>
              <div className="erpx-sn erpx-pan-name">
                <i aria-hidden>P</i>Panameer
              </div>
              {PANAMEER_OBJECTS.map((o) => (
                <div className="erpx-obj" key={o.name}>
                  {o.name}
                  {/* Second line, smaller — see PANAMEER_OBJECTS. One entry uses it. */}
                  {o.qualifier && <span className="erpx-obj-q">{o.qualifier}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── two doorways, on the mechanism already shipped ──────────────── */}
        <div className="erpx-doors">
          {DOORS.map((d, i) => (
            <button
              type="button"
              key={d.name}
              className="erp-card door"
              /* A real button: opens on click, tap, Enter and Space. */
              aria-haspopup="dialog"
              style={{ ["--tf" as string]: d.tf }}
              onClick={() => setOpenIdx(i)}
            >
              {/*
                ⚠ NOTHING INSIDE THE CROP IS INTERACTIVE — the E097 rule. These
                two scenes have no controls at all, so the provider is belt and
                braces; it is here so a future edit to the flow inherits the
                guard instead of rediscovering it.
              */}
              <span className="crop" aria-hidden>
                <DecorativeSceneProvider value={true}>
                  <span className="crop-inner" style={{ transform: d.tf }}>
                    {d.scene}
                  </span>
                </DecorativeSceneProvider>
              </span>
              <span className="db">
                <span className="db-h3">{d.name}</span>
                <span className="db-p">{d.desc}</span>
                <span className="db-open">See the flow ›</span>
              </span>
            </button>
          ))}
        </div>

        {/* ── what it costs ──────────────────────────────────────────────── */}
        <div className="erpx-cost">
          <h3>What it costs</h3>
          {COSTS.map((c) => (
            <div className="erpx-crow" key={c.row}>
              <b>{c.row}</b>
              <div>{c.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/*
        THE SHIPPED LIGHTBOX, NOT A SECOND ONE. `Lightbox` already carries the
        focus trap, the Esc and click-outside handling and the focus return, and
        `check:ui` already asserts all of it. A second implementation would be a
        second thing to get wrong.
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
