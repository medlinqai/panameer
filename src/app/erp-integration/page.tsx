import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ErpIntegration } from "@/components/marketing-home/ErpIntegration";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

/**
 * `/erp-integration` — `ErpIntegration` AT ITS OWN ADDRESS (`P1-J0-E359`).
 *
 * Scott, 2026-08-29, of `/integrate`: *"this page is incorrect. It puts the image on
 * the same page (muddies the water) and then scrolls down to it. I want to do the
 * same thing here. I want to move image 2 to a secon[d] page. then i want to link the
 * button - image 3 - to that page."*
 *
 * ── ⚠⚠ A MOVE, NOT A COPY ──────────────────────────────────────────────────────
 *
 * `ErpIntegration` came OFF `/integrate` in the same commit and renders HERE AND
 * NOWHERE ELSE. Third page built to this pattern: `E352` (`/capability-domains`),
 * `E358` (`/service-products`), this. ⚠ `E352` shipped as a COPY and `E355` had to
 * reverse it one commit later; both this brief and `E358` were explicit that the same
 * mistake was not to be repeated.
 *
 * ── ⚠⚠ `id="punchout"` TRAVELLED WITH THE SECTION, AND IT HAD THREE CONSUMERS ───
 *
 * The anchor is on THIS wrapper, not inside `ErpIntegration` — the component rendered
 * on `/` until `E255` and could again, and an id inside it would appear on two pages.
 * ONE ID, ONE PAGE, ONE MEANING.
 * ⚠ `scroll-mt-[71px]` IS THE MEASURED STICKY `MarketingHeader` HEIGHT, read off
 * `getBoundingClientRect()` rather than guessed or taken from a token. Without it the
 * anchor scrolls the heading UNDER the header.
 *
 * ⚠⚠ THREE LIVE CONSUMERS MOVED WITH IT, and the third is the one that breaks
 * silently because nothing on this page references it:
 *   1. `IntegrateHero.tsx` — was `href="#punchout"`, now `/erp-integration`.
 *   2. `home-sections.ts` — HOME section 6's `ctaHref`, was `/integrate#punchout`,
 *      now `/erp-integration`. ⚠ `E350` SET THAT STRING BECAUSE `ErpPunchout` LEFT
 *      `/` AND ITS ANCHOR DIED. Missing it here would have re-created that exact
 *      defect one page over — the button would land on `/integrate` and scroll to
 *      nothing. `E359` clicked it in a browser rather than reading the href.
 *   3. `e2e/marketing-home.spec.ts` §43 — repointed, not retired. The rule it guards
 *      ("this section lives on exactly one page") is unchanged; only the page moved.
 *
 * ⚠ A FOURTH `id="punchout"` EXISTS ON DISK, in `ErpPunchout.tsx:52`. That component
 * has rendered on NO page since `E350`, so there is no duplicate today — but if it is
 * ever re-added to a page, check this one first. Two live `#punchout` ids is a defect.
 *
 * ⚠ THE ANCHOR IS ARGUABLY REDUNDANT NOW: this page's only content IS that section,
 * so `/erp-integration` and `/erp-integration#punchout` land in the same place.
 * REPORTED AT `E359`, NOT DECIDED — keeping it means the deep link still resolves and
 * §43 repoints instead of retiring. Removing it is Scott's call.
 *
 * ── ⚠⚠ THE `.pm-home` WRAPPER AND THE STYLESHEET ARE BOTH REQUIRED ─────────────
 *
 * `ErpIntegration`'s styles are `.pm-home`-scoped with an `erpx-` prefix in
 * `home.css` — its own header at `:16` says so. Without BOTH the import above and the
 * wrapper below this page renders an unstyled stack: a ~16px headline over a
 * collapsed diagram. ⚠ VERIFIED FOR `E359` BY SCREENSHOTTING at 1440, 1160 and 390
 * and looking at the pixels, not by reading the class list. That is the `.pm-home`
 * trap and it has cost this project six defects.
 *
 * ⚠ HEADER AND FOOTER SIT OUTSIDE THE WRAPPER, load-bearing in both directions:
 *   · `home.css` carries the mockup's `*{margin:0;padding:0}` reset; scoped to
 *     `.pm-home *` it strips `MarketingHeader`'s Tailwind spacing (`P1-ALL-E020`).
 *   · `P1-ALL-E020` also measured the footer INSIDE the wrapper — inherited colour
 *     repainted `#cfc7da` -> `#aeb4cf`, height 910px on five pages and 1008px on
 *     another.
 *
 * ⚠ `className="erpx-band"` TRAVELLED UNCHANGED. It is the chrome class and was not
 * re-authored for the new context; how it reads standalone is in the `E359` report.
 *
 * ⚠ NO PAGE FURNITURE, DELIBERATELY — no hero, heading, lede, back-link or CTA. The
 * component carries its own eyebrow (`ERP Integration`), headline, diagram, scenes
 * and cost table.
 *
 * ⚠ THE ROUTE NAME IS CHAT'S, NOT SCOTT'S — he named neither the page nor the URL.
 * `/erp-integration` matches the section's own eyebrow. Flagged in the report;
 * renaming this folder is one line plus two `href`s.
 */

/*
  ⚠⚠ CHAT DID NOT DRAFT MARKETING COPY. Both strings come from the component's own
  LIVE text — its eyebrow and headline — so nothing here can drift from what the page
  renders. ⚠ REPORTED VERBATIM IN THE `E359` REPORT so Scott can replace either; it is
  metadata, not approved copy.
*/
export const metadata: Metadata = {
  title: "ERP Integration — Panameer",
  description:
    "Integrate seamlessly with the click of a button — how Panameer reaches " +
    "your ERP for fulfillment and settlement, and what it costs.",
};

export default function ErpIntegrationPage() {
  return (
    <>
      {/* ⚠ OUTSIDE `.pm-home` — see the header note in the block above. */}
      <MarketingHeader />
      <div id="punchout" className="pm-home pm-solo scroll-mt-[71px]">
        <ErpIntegration className="erpx-band" />
      </div>
      {/* ⚠ OUTSIDE `.pm-home` — see the footer note in the block above. */}
      <MarketingFooter />
    </>
  );
}
