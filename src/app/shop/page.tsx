import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ShopHero } from "@/components/marketing/ShopHero";
import { ShopSpine } from "@/components/marketing/ShopSpine";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
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
 * ── ⚠⚠ AND THAT IS WHY THE HERO BUTTON HAS NO DESTINATION (`P1-J2-E002`) ────
 *
 * `Start Shopping Now` ships DISABLED. There is no public surface anywhere in the
 * app that lists `Package` rows: `listPublishedPackages` has ONE caller and the
 * page it feeds 307s to `/login`, `(app)/packages` and `(app)/services/offers` are
 * both `ComingSoon` AND auth-gated, and `/explore` lists PEOPLE. ⚠ THE HREF IS THE
 * ONE THING THIS WORK STREAM STOPPED ON, by instruction. See `ShopHero`.
 *
 * ── ⚠ THE HERO IS `ShopHero` NOW, NOT `MarketingHero` (`P1-J2-E001`) ─────────
 *
 * Its kicker and `<h1>` literally read `PLACEHOLDER — Shop` and `PLACEHOLDER —
 * headline about packaged services goes here.` on a top-level nav destination.
 * ⚠ `BUY_SERVICES_HERO` STAYS IN `lib/brand.ts`, NOW UNIMPORTED — the `E164`
 * resolution. `MarketingHero` is untouched and still serves `/enterprise` and
 * `/why-panameer`.
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
      <ShopHero />
      {/*
        ⚠ THE SPINE SITS DIRECTLY UNDER THE HERO (`P1-J2-E003`), before
        `ErpPackages` — the same placement `/find-work` uses (`P1-J4-E006`) and for
        the same reason: the five steps are how the page explains itself, so they
        come before the thing it is showing.

        ⚠⚠ ZERO OF THE FIVE STEPS ARE BUILT — the first spine on the site with
        nothing behind any step. See `SHOP_BUILD_STATE`'s note in
        `lib/shop-steps.ts`; all five are on the pre-launch list as ONE block.
      */}
      <ShopSpine />
      {/*
        ⚠ `ErpPackages` IS UNTOUCHED AND STAYS WHERE IT WAS — not instructed, so
        not moved and not re-authored. It now sits BELOW the spine rather than
        directly under the hero, which is the only positional change and is a
        consequence of the spine being inserted above it.

        ⚠ IT IS NOT THE CATALOG AND ITS OWN HEADER SAYS SO: agent CATEGORIES, no
        provider name, no price, no rating, no availability count on any card. That
        is exactly why it cannot be `Start Shopping Now`'s destination — see the
        note on the button in `ShopHero`.

        ⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING and stays around the PAYLOAD ONLY.
        Measured, not assumed: strip the class and `.erp-head h2` drops from 40px to
        16px and the card grid collapses. ⚠ THE SPINE IS DELIBERATELY OUTSIDE IT —
        `StepDisclosures` is `.stepd-`-scoped and the eyebrow is Tailwind mirroring
        `/optimize`'s computed values, which is the seventh instance of that trap.
      */}
      <div className="pm-home">
        <ErpPackages />
      </div>
    </MarketingShell>
  );
}
