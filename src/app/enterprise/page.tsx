import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
import { ENTERPRISE_HERO } from "@/lib/brand";
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
      <MarketingHero
        audience="buyer"
        kicker={ENTERPRISE_HERO.kicker}
        headline={ENTERPRISE_HERO.headline}
      />
      {/* The scope for the ported stylesheet, around the payload only. */}
      <div className="pm-home">
        <ErpIntegration className="erpx-band" />
      </div>
    </MarketingShell>
  );
}
