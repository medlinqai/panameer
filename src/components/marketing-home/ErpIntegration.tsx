"use client";

import { useState } from "react";
import { BRAND_ERP_TAGLINE } from "@/lib/brand";
import { Lightbox } from "@/components/marketing-home/Lightbox";
import { DecorativeSceneProvider } from "@/components/marketing-home/scenes/decorative";
import { FulfillmentScene } from "@/components/marketing-home/scenes/FulfillmentScene";
import { SettlementScene } from "@/components/marketing-home/scenes/SettlementScene";

/**
 * "Integrate Seamlessly — with the Click of a Button" (brief_home_erp_integration).
 *
 * Ported from 2. Claude Sub-Files/mockups/erp_integration_section.html, which
 * Scott approved and which is the spec for layout, copy and content. Styles
 * live in home.css under `.pm-home` with an `erpx-` prefix; nothing here is a
 * <style> block.
 *
 * ── ⚠ THIS COMPONENT SERVES TWO SURFACES — KEEP IT PLACEMENT-AGNOSTIC ────────
 *
 * It renders on `/` today and becomes the mainstay of the Enterprise page next
 * (Scott, 2026-08-15). So it assumes NOTHING about what sits above or below it:
 * no `id`, no scroll anchor, no margins tuned to its neighbours, and no
 * background or vertical padding of its own. Section chrome is the PARENT'S
 * job, passed in as `className`.
 *
 * To drop it on a second page the parent must supply exactly three things:
 *   1. an ancestor carrying `pm-home` — every rule in home.css is scoped to it;
 *   2. an import of `home.css`;
 *   3. a chrome class via `className` (on `/` that is `erpx-band`).
 * That is the whole adoption. Do not add a fourth by baking anything in here.
 *
 * ── ⚠ THERE IS ANOTHER ERP SECTION AND IT IS NOT THIS ONE ────────────────────
 *
 * `src/components/marketing/sections/ErpPunchout.tsx` renders "Punch Out for
 * Talent — Not Just Parts" at `/hire-talent#punchout`, and the header's
 * Enterprise nav item resolves to that anchor. Per this brief it is untouched —
 * not deleted, not edited, not repointed. Which of the two survives is settled
 * by the Enterprise-page brief, not here.
 *
 * ── ⚠ NO ORACLE LOGO. EVER, UNTIL COUNSEL SAYS OTHERWISE ─────────────────────
 *
 * Scott's source deck uses the red ORACLE wordmark. Putting another company's
 * trademark on Panameer's marketing page is a cleared-or-not question, and it
 * has not been cleared. "Oracle Cloud ERP" renders as TEXT. Same gate as the
 * tax claims: if anyone wants the mark, counsel first.
 *
 * ── STILL PRESENTATIONAL ─────────────────────────────────────────────────────
 *
 * This describes a Phase 2 capability. There is deliberately no "Connect your
 * ERP" button and no "● Live" badge — nothing here can be clicked into
 * existence today, and a CTA would say otherwise.
 */

/* ── the head ─────────────────────────────────────────────────────────────── */

/**
 * The three claims. `n` is a bare figure on purpose — no "+" and no "x", so
 * nothing reads as a growth stat. "0" is the strongest of the three and leads.
 */
const CLAIMS: readonly { n: string; head: string; body: string }[] = [
  {
    n: "0",
    head: "integrations most buyers have today",
    body: "Services procurement is the last unautomated corner of the ERP.",
  },
  {
    n: "6",
    head: "documents move automatically",
    body: "Requisition, agreement, PO, acknowledgement, invoice, payment.",
  },
  {
    n: "1",
    head: "click to connect",
    body: "No middleware project, no integration team, no re-keying.",
  },
];

/* ── the overview diagram ─────────────────────────────────────────────────── */

/** Left column. Six documents — the same six the "6" claim counts. */
const ERP_DOCS: readonly string[] = [
  "Purchase Agreement",
  "Purchase Requisition",
  "Purchase Order",
  "Purchase Order Acknowledge",
  "Invoice",
  "Payment",
];

/**
 * Right column. Nine steps in three groups, and the GROUPING is content: bid,
 * then work order, then release. A flat list of nine would read as a queue.
 */
const PANAMEER_STEPS: readonly (readonly string[])[] = [
  ["Create Work Request", "Invite Providers to Bid", "Providers Propose Rate", "Requester Accepts Rate"],
  ["Auto-Create Work Order", "Invitation to Accept Work Order"],
  ["Accept Work Order", "Release Work Order"],
];

/**
 * ⚠ THE RAIL NAMES ARE THE WHOLE POINT OF THIS SECTION.
 *
 * POSR, Return Cart, POOM, cXML, EFT — a procurement reader recognises every
 * one of them and knows within a second whether we are serious or generating
 * marketing words. Do not soften them into plain English; the plain English is
 * the caption underneath, which is there for everyone else.
 *
 * `out` means ERP → Panameer. Three out, two back: the arrow direction is a
 * factual claim about which system initiates, not decoration.
 */
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
  /**
   * ⚠ TRANSLATE ONLY — NO `scale()`, AND THAT IS THE RULE NOT A PREFERENCE.
   *
   * The scenes are 1080px diagrams now, and the crop is a WINDOW ONTO THEM AT
   * TRUE SCALE: the pixels in the card are the same pixels the dialog shows.
   * `brief_home_tiles_and_lightboxes` settled this — a shrunk screenshot of the
   * whole thing is unreadable mush, and the earlier `scale(.34)`/`scale(.58)`
   * framings on these two cards died with the swimlane version.
   *
   * Both offsets were chosen to frame A DOCUMENT AND A STEP WITH AN ARROW
   * BETWEEN THEM, because the card has to say "two systems talking" before
   * anyone clicks: Fulfillment lands on the Purchase Requisition chip and the
   * crossing into Create Work Request; Settlement on Purchase Receipt, the ERS
   * arrow and the settlement-approval crossing.
   */
  tf: string;
  scene: React.ReactNode;
};

const DOORS: readonly Door[] = [
  {
    name: "Fulfillment",
    /*
      "Eight hand-offs" went with the swimlanes — it counted lanes, and there are
      no lanes any more. The four-column diagram is about WHO holds the document,
      so the description names the four parties instead.
    */
    desc: "Requisition to released work order — every hand-off between the requester, Oracle, Panameer and the provider.",
    label: "Service procurement fulfillment flow",
    tf: "translate(-190px,-80px)",
    scene: <FulfillmentScene />,
  },
  {
    name: "Settlement",
    desc: "From work delivered to money moved — approved settlement writes the receipt, the ERS invoice and the payment.",
    label: "Service procurement settlement flow",
    tf: "translate(-190px,-190px)",
    scene: <SettlementScene />,
  },
];

/* ── what it costs ────────────────────────────────────────────────────────── */

/**
 * ⚠ SCOTT'S PRICING MODEL, STATED EXACTLY. DO NOT PARAPHRASE.
 *
 * And ⚠ NO PER-TRANSACTION FIGURE APPEARS ANYWHERE. The model is described;
 * the price is not set. "$0.01" was discussed and is explicitly NOT approved
 * for the page. If a number ever lands here it arrives with Scott's sign-off,
 * not with a designer filling a gap.
 */
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

        <div className="erpx-claim">
          {CLAIMS.map((c) => (
            <div className="erpx-cl" key={c.head}>
              <span className="erpx-n">{c.n}</span>
              <span className="erpx-t">
                <b>{c.head}</b>
                {c.body}
              </span>
            </div>
          ))}
        </div>

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
              {ERP_DOCS.map((d) => (
                <div className="erpx-doc" key={d}>
                  {d}
                </div>
              ))}
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
              {PANAMEER_STEPS.map((group, g) => (
                <div className="erpx-grp" key={g}>
                  {group.map((s) => (
                    <div className="erpx-stp" key={s}>
                      {s}
                    </div>
                  ))}
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
