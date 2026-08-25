import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { IntegrateHero } from "@/components/marketing/IntegrateHero";
import { LogoRibbon } from "@/components/marketing-home/LogoRibbon";
import { IntegrateSpine } from "@/components/marketing/IntegrateSpine";
import { ErpPunchout } from "@/components/marketing/sections/ErpPunchout";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
import "@/components/marketing-home/home.css";

/**
 * /enterprise — the ERP integration story, at its own address
 * (brief_public_ia_block2 WS-2).
 *
 * ── A DESTINATION, BUILT BEFORE ANYTHING MOVES ───────────────────────────────
 *
 * Scott's rule: nothing comes off Home until its destination page exists and
 * renders it. Relocation is a move, never a delete. So this page exists and
 * `ErpIntegration` ALSO still renders on `/`. The same section deliberately
 * renders in two places until block 3 removes it from Home. That is intended
 * and temporary — do not "fix" it by deleting either one.
 *
 * ── NO AUDIENCE STRIP, AND NO NAV ITEM ───────────────────────────────────────
 *
 * `MarketingShell` without `page` (WS-1). The strip is a three-way intent
 * switch and this is not one of the three; adding a fourth entry would have
 * changed it on Home, Hire Talent and Find Work. Reachable from the FOOTER
 * only — Scott's 2026-08-17 decision keeps the header at four items.
 *
 * ── ⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING ─────────────────────────────────
 *
 * `ErpIntegration` is a marketing-home section: every rule that styles it in
 * `home.css` is prefixed `.pm-home`, and `MarketingShell` renders no such
 * scope. MEASURED, not assumed — strip the class in the browser and `.erpx-h2`
 * drops from 40px/900px-wide to 16px/full-bleed. The section renders as
 * unstyled stacked text without it.
 *
 * The wrapper goes INSIDE the shell and around the PAYLOAD ONLY — never around
 * the header or footer, which are Tailwind components the ported stylesheet's
 * own comment records having broken once already. Verified: `header`, the hero
 * `h1` and `footer` all resolve `closest(".pm-home") === null`.
 *
 * ⚠ `erpx-band` IS PASSED IN, exactly as `/` passes it. The component owns no
 * background or padding of its own precisely so a second surface can supply its
 * own chrome; this is that second surface.
 *
 * ⚠ `/hire-talent` carries `ErpPunchout`, a DIFFERENT ERP section with a
 * different job. It is untouched and not reconciled with this one — that they
 * coexist is a question for Scott, not a task here.
 *
 * Server component throughout, so this route prerenders static.
 */
export const metadata: Metadata = {
  title: "Enterprise ERP Integration — Panameer",
  description:
    "Search, request, order and settle services from inside Oracle Cloud, SAP " +
    "and other systems of record — without leaving your ERP.",
};

export default function EnterprisePage() {
  return (
    <MarketingShell>
      {/*
        ── ⚠⚠ WALK 1: THIS PAGE SAID `PLACEHOLDER` (`P1-J0-E325`) ─────────────

        `/integrate` had never been walked. Its kicker read `PLACEHOLDER —
        Enterprise` and its `<h1>` read `PLACEHOLDER — headline about ERP
        integration goes here.` ⚠ IT IS `IntegrateHero` NOW — its own component
        composing the same `HeroBox` + `HeroVideoBackdrop` + `HeroTwoUp` every other
        pillar hero uses, so nothing about the SHAPE is re-implemented.

        ⚠ `MarketingHero` IS UNTOUCHED AND STILL SERVES `/why-panameer`, which is
        not in this brief and is proven byte-identical in the report. Its `videoSrc`
        prop stays; this page simply no longer calls it.

        ⚠ THE CLIP AND ITS POSTER MOVED ACROSS UNCHANGED — `consultation-hero.mp4`
        (0.26MB) with `/posters/create.svg`. Losing the poster would have taken this
        page's LCP from ~1.8s back to ~3.7s (`P1-ALL-E018`).
      */}
      <IntegrateHero />
      {/*
        ── ⚠⚠ THE RIBBON (`P1-J0-E326`) ────────────────────────────────────────

        Scott: *"Let's bring back the ribbon on this page."* It rendered only on `/`.

        ⚠ IT **MUST** SIT INSIDE A `.pm-home` WRAPPER. `LogoRibbon`'s markup is
        `.logos` / `.wrap` / `.row` / `.co` — every one of those is a
        `.pm-home`-prefixed rule in `home.css`, and this page is not otherwise inside
        that scope. ⚠ MEASURED ON BOTH PAGES, NOT INSPECTED; the geometry is in the
        report. This trap has caused five defects.

        ⚠⚠ AND WHAT IT RENDERS IS SIX INVENTED COMPANY NAMES — Meridian, Northpeak,
        Vantage, Cedarline, Halcyon, Brightpath. NOT CUSTOMERS, not logos, just words
        beside generic SVG glyphs. A logo wall of non-customers is a traction claim.
        ⚠ SHIPPED BECAUSE SCOTT ASKED FOR IT AND REPORTED PLAINLY so he can decide
        whether it belongs here — or comes off `/` too.
      */}
      <div className="pm-home">
        <LogoRibbon />
      </div>
      {/*
        ── ⚠⚠ THE SIXTH SPINE (`P1-J0-E328`) ───────────────────────────────────

        ⚠ IT CLOSES THE OPEN ROW `brief_integrate_walk1` FILED. That brief shipped
        the hero's bridge line — *"Check out the steps below to see how it works."*
        — onto a page with NO steps below it, and recorded the gap. There are steps
        now, and the line points at them.

        ⚠ PLACEMENT: directly below the hero and ABOVE `ErpIntegration`, so the
        bridge line's "below" is the very next thing a reader meets.

        ⚠⚠ ZERO OF THE FIVE ARE BUILT AND SCOTT SAID SO: *"Yes, it is not built,
        but it will be before this is released."* Same standing as `/shop`.
        Outstanding parts gate PROMOTION, not the build; all five are on the
        pre-launch list as one block.

        ⚠ OUTSIDE THE `.pm-home` WRAPPER, deliberately — `StepDisclosures` is
        `.stepd-`-scoped and the eyebrow mirrors `/optimize` in Tailwind.
      */}
      <IntegrateSpine />
      {/* The scope for the ported stylesheet, around the payload only. */}
      <div className="pm-home">
        <ErpIntegration className="erpx-band" />
      </div>
      {/*
        ── ⚠ `ErpPunchout`, MOVED HERE FROM `/hire-talent` (`P1-J1-E020`) ────────

        Scott, 2026-08-24, screenshotting *"Punch out for talent — not just
        parts."*: *"This needs to be moved to INTEGRATE."*

        ⚠ IT IS THE INTEGRATE STORY BY DEFINITION, not just a tidier address.
        `integration_model.md`: *"the services procurement integration uses cXML
        format and REST APIs ... as detailed in the model on the integrate page."*
        This section IS that chain — requisition -> find & hire -> approve & PO ->
        work order -> service receipt, with the ERP as system of record.

        ⚠ ONE CALL SITE BEFORE THE MOVE, VERIFIED: `hire-talent/page.tsx:91` and
        nowhere else. So this is a relocation, not a shared-component question.

        ── ⚠⚠ WHY IT SITS **OUTSIDE** THE `.pm-home` DIV ────────────────────────

        `ErpPunchout` is pure Tailwind — `bg-[#f6f4fb]`, `max-w-[1120px]`,
        `border-line`. `.pm-home` sets a font stack, a colour and a line-height on
        everything inside it, so putting this section in there would restyle it in a
        way `/hire-talent` never did. OUTSIDE the wrapper reproduces its previous
        environment exactly — measured on both pages, identical.

        ⚠ THAT SCOPING TRAP HAS BITTEN FOUR TIMES (`.sd-n`, `P1-J0-E290`, the footer
        `P1-ALL-E013`, `/learn`'s hero). It was checked here, not assumed.

        ── ⚠ THE ORDER: `ErpIntegration` THEN `ErpPunchout` ────────────────────

        General before specific. `ErpIntegration` is the integration MODEL — what
        connects to what. This is the one PROCESS that model exists to serve, and it
        names the ERP at every step. Reading the chain first and the model second
        would explain the mechanism to somebody who had not yet been told what it
        is for. (`ErpPackages` is NOT on this page — it renders on `/buy-services`;
        the brief's premise that both were here did not hold.)

        ⚠⚠ REPORTED, NOT FIXED: `ENTERPRISE_HERO` STILL LITERALLY READS
        `"PLACEHOLDER — headline about ERP integration goes here."` This is a strong
        section landing on an unwalked page whose hero is a placeholder.
        `/enterprise` needs its own walk.
      */}
      <ErpPunchout />
    </MarketingShell>
  );
}
