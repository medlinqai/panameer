import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ErpPackages } from "@/components/marketing-home/ErpPackages";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

/**
 * `/service-products` — `ErpPackages` AT ITS OWN ADDRESS (`P1-J0-E358`).
 *
 * Scott, 2026-08-29: *"now i want to move the image 1 to a separate page. I then want
 * to create a button like what we did on /optimize, but call it 'What are Service
 * Products?'. Lastly, I want to link the button to the page."*
 *
 * ── ⚠⚠ THIS IS A MOVE, NOT A COPY ──────────────────────────────────────────────
 *
 * `ErpPackages` came OFF `/shop` in the same commit and now renders HERE AND NOWHERE
 * ELSE. ⚠ `E352` built `/capability-domains` as a copy and `E355` had to reverse it
 * one commit later; this brief was explicit that the same mistake was not to be
 * repeated. DO NOT re-add the section to `/shop`.
 *
 * ⚠⚠ THE MOVE CLOSED A DEFECT THE COMPONENT ALREADY DOCUMENTED. `ErpPackages`' own
 * `Explore Service Products ›` button is `href="/shop"`, and while the section lived
 * on `/shop` that button reloaded the page the visitor was already reading
 * (`P1-J2-E011`). From here it is a real destination. ⚠ THE `href` WAS NOT TOUCHED —
 * relocation is what fixed it, and editing it would re-break that.
 * ⚠ `P1-J2-E010` AND `P1-J1-E032` REMAIN OPEN: there is still no public catalogue,
 * and `/shop`'s primary hero button is still `aria-disabled` with a `Soon` pill.
 *
 * ── ⚠⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING, AND IT WAS MEASURED ─────────────
 *
 * `ErpPackages` is styled entirely by `.pm-home`-prefixed rules in `home.css` — it
 * renders `.erp`, `.wrap`, `.erp-head`, `.eyebrow`, `.erp-grid`, `.erp-card`, `.crop`
 * and the `.db-*` scene classes. ⚠ MEASURED ON `/shop` BEFORE THE MOVE AND CARRIED
 * HERE WITH THE SECTION: strip the class and `.erp-head h2` DROPS FROM 40px TO 16px
 * and the card grid COLLAPSES. That sentence used to live in `app/shop/page.tsx`;
 * it moved here because this is now the page it describes.
 * ⚠ SO THIS PAGE NEEDS BOTH the `home.css` import above AND the wrapper below.
 * Verified for `E358` by screenshotting at 1440, 1160 and 390 and looking at the
 * pixels — a ~16px headline over a collapsed grid is the missing wrapper.
 *
 * ⚠ THE HEADER AND FOOTER SIT OUTSIDE THE WRAPPER, load-bearing in both directions:
 *   · `home.css` carries the mockup's `*{margin:0;padding:0}` reset; scoped to
 *     `.pm-home *` it strips `MarketingHeader`'s Tailwind spacing (`P1-ALL-E020`).
 *   · `P1-ALL-E020` also measured the footer INSIDE the wrapper — its inherited
 *     colour repainted `#cfc7da` -> `#aeb4cf`, and it stood 910px on five pages and
 *     1008px on another.
 * ⚠ THIS PAGE USES `MarketingHeader`/`MarketingFooter` DIRECTLY rather than
 * `MarketingShell`, matching `/capability-domains` and `/ai-method` — the two
 * precedents this was copied from. `/shop` uses the shell; both shapes are live and
 * this one keeps the wrapper question explicit at the call site.
 *
 * ── ⚠ NO PAGE FURNITURE, DELIBERATELY ──────────────────────────────────────────
 *
 * No hero, heading, lede, breadcrumb, back-link or closing CTA. `ErpPackages` carries
 * its own eyebrow (`Pre-Defined Services`), headline, sub-line and button. Inventing
 * page copy here would be chat writing marketing text Scott has not seen.
 *
 * ⚠ THE ROUTE NAME IS CHAT'S, NOT SCOTT'S. He named the button, not the URL.
 * `/service-products` matches both the button label and the section's own
 * `Explore Service Products` control. Flagged in the `E358` report — renaming this
 * folder is a one-line change plus the `href` in `ShopHero.tsx`.
 */

/*
  ⚠⚠ CHAT DID NOT DRAFT MARKETING COPY. Both strings come from the component's own
  LIVE text — its eyebrow and headline — so nothing here can drift from what the page
  renders. ⚠ REPORTED VERBATIM IN THE `E358` REPORT so Scott can replace either; it is
  metadata, not approved copy.
*/
export const metadata: Metadata = {
  title: "Service Products — Panameer",
  description:
    "Pre-built AI agents for Oracle applications — reports and dashboards, " +
    "price alerts, document validation, and extending your apps.",
};

export default function ServiceProductsPage() {
  return (
    <>
      {/* ⚠ OUTSIDE `.pm-home` — see the header note in the block above. */}
      <MarketingHeader />
      <div className="pm-home">
        <ErpPackages />
      </div>
      {/* ⚠ OUTSIDE `.pm-home` — see the footer note in the block above. */}
      <MarketingFooter />
    </>
  );
}
