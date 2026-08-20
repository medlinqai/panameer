import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { BUY_SERVICES_HERO } from "@/lib/brand";
import "@/components/marketing-home/home.css";

/**
 * /buy-services — the public "Buy Services" nav destination.
 *
 * ── ⚠ IT IS A REAL PAGE NOW (brief_public_ia_block2 WS-4) ────────────────────
 *
 * This was a 35-line `ComingSoon` stub AND a top-level header item — the most
 * visible broken promise on the public surface. It now renders `ErpPackages`,
 * the packaged-services section from the marketing home.
 *
 * WHY /buy-services AND NOT /packages — THE ORIGINAL REASONING, STILL TRUE:
 * `(app)/packages` already owns `/packages`. A route group adds no URL segment,
 * so a second `src/app/packages` would be a duplicate route and fail the build —
 * and that authed page is the provider's OWN packages, a different thing from a
 * public catalogue. Scott's call: the public page lives here; the authed route is
 * untouched. (The header label was "Packages" under the old six-item nav; it
 * became "Buy Services" when block 1 cut the header to four, and is "Shop" as of
 * E222, 2026-08-19. ⚠ THE ROUTE HAS NEVER CHANGED and deliberately does not now —
 * see the note on `MARKETING_NAV`.)
 *
 * ── STILL NOT THE CATALOGUE, AND THE SECTION IS HONEST ABOUT IT ──────────────
 *
 * `ErpPackages` shows agent CATEGORIES, not purchasable listings: no card
 * carries a provider name, a price, a rating or an availability count, and its
 * own header comment records that as the line. So this page answers "what can I
 * buy" without pretending a catalogue exists. The section ALSO still renders on
 * `/` — nothing comes off Home until block 3.
 *
 * ── ⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING ─────────────────────────────────
 *
 * `ErpPackages` is styled entirely by `.pm-home`-prefixed rules in `home.css`
 * and `MarketingShell` provides no such scope. MEASURED, not assumed — strip the
 * class and `.erp-head h2` drops from 40px to 16px and the card grid collapses.
 *
 * Inside the shell, around the PAYLOAD ONLY. Verified: `header`, the hero `h1`
 * and `footer` all resolve `closest(".pm-home") === null`.
 *
 * ⚠ `ErpPackages` is a CLIENT component (it owns the lightbox). That does not
 * make the route dynamic — only request-time data would — so this page still
 * prerenders static. Check the build's route table, do not assume.
 */
export const metadata: Metadata = {
  /* ⚠ MIRRORS THE NAV LABEL, so it moved with it (E222). The other three nav
     destinations' titles are their own sentences rather than the menu word, so
     they were left alone. */
  title: "Shop — Panameer",
  description:
    "Productized services on Panameer — a fixed scope, a fixed price, a named expert.",
};

export default function BuyServicesPage() {
  return (
    <MarketingShell>
      <MarketingHero
        audience="buyer"
        kicker={BUY_SERVICES_HERO.kicker}
        headline={BUY_SERVICES_HERO.headline}
      />
      {/* The scope for the ported stylesheet, around the payload only. */}
      <div className="pm-home">
        <ErpPackages />
      </div>
    </MarketingShell>
  );
}
