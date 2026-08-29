import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

/**
 * `/ai-method` — AIM, THE AI METHOD, AT ITS OWN ADDRESS (`P1-J0-E356`).
 *
 * Scott, 2026-08-28: *"Create a standalone page for this graphic. Link it to the
 * footer text under solutions called 'The AI Method'."* The graphic is
 * `MethodologyRing` — the five-lobe wheel, Define / Design / Develop / Decide /
 * Deploy around a `Continuous Transformation` hub.
 *
 * ⚠ THE FOOTER'S `The AI Method (aka AIM)` ROW IS THE ONLY THING THAT LINKS HERE,
 * and it is the only anchor in that whole video band. See `footer-videos.ts`.
 * ⚠ THE VIDEO IS NOT HERE AND IS NOT IN SCOPE. Scott: *"I will come back and add
 * video later."*
 *
 * ── ⚠⚠ THIS IS NOT A SINGLE-HOME SECTION, AND THAT IS THE THING TO KNOW ────────
 *
 * `MethodologyRing` RENDERS ON TWO PAGES: this one and `/why-panameer:62`.
 * `E356` §4 removed it from `/` only. ⚠ SCOTT NAMED HOME AND NOTHING ELSE — the
 * `/why-panameer` render was almost certainly never in front of him, so it was
 * REPORTED rather than removed. ⚠ DO NOT "DE-DUPLICATE" THE TWO on the strength of
 * this page existing; that is his call and he has not made it.
 * ⚠ THE EYEBROW RENAME IN §1 HIT BOTH PAGES — one component, one string. Also
 * reported, for the same reason.
 *
 * ── ⚠⚠ THE STRUCTURE IS `/capability-domains`'s, WHICH IS `/optimize`'s ────────
 *
 * `MethodologyRing` renders `.block`, `.wrap`, `.center`, `.eyebrow`, `.wheel`,
 * `.wheel-svg`, `.hub`, `.wnode` and `.wsub`. ⚠ ALL NINE WERE CHECKED INDIVIDUALLY
 * AGAINST `home.css` FOR `E356` rather than taken on trust, and every one is
 * `.pm-home`-scoped with NO unscoped fallback:
 *   `.pm-home .center` · `.pm-home .eyebrow` · `.pm-home .hub` · `.pm-home .wheel`
 *   `.pm-home .wheel-svg` · `.pm-home .wnode` · `.pm-home .wrap` · `.pm-home .wsub`
 *   and `.block` as `.pm-home section.block` (home.css:1029 — a comment sits INSIDE
 *   that selector, which is why a naive grep for `.pm-home .block` finds nothing and
 *   would wrongly report it unscoped).
 * ⚠ SO WITHOUT BOTH THE STYLESHEET IMPORT ABOVE AND THE WRAPPER BELOW this page is
 * an unstyled stack of divs and a bare `<svg>`. THAT IS THE `.pm-home` TRAP AND IT
 * HAS COST THIS PROJECT SIX DEFECTS. Verified here by screenshotting at 1440 and 390
 * and looking at the pixels, not by reasoning about the class list.
 *
 * ⚠ THE HEADER AND FOOTER SIT OUTSIDE THE WRAPPER, load-bearing in both directions:
 *   · `home.css` carries the mockup's `*{margin:0;padding:0}` reset; scoped to
 *     `.pm-home *` it strips `MarketingHeader`'s Tailwind spacing (`P1-ALL-E020`).
 *   · `P1-ALL-E020` also measured the footer INSIDE the wrapper — its inherited
 *     colour repainted `#cfc7da` -> `#aeb4cf`, and it stood 910px on five pages and
 *     1008px on another.
 * ⚠ IT IS THE MIRROR OF `P1-ALL-E013`, where `HomeFooter` was fixed by *adding*
 * `.pm-home`. That footer needed the scope; this one has to escape it.
 *
 * ── ⚠ NO PAGE FURNITURE, DELIBERATELY ──────────────────────────────────────────
 *
 * No hero, heading, lede, breadcrumb, back-link or CTA. The component carries its own
 * eyebrow (`AIM - The AI Method`), headline and sub-line. Inventing page copy here
 * would be chat writing marketing text Scott has not seen.
 *
 * ⚠ THE ROUTE NAME IS CHAT'S, NOT SCOTT'S. He named the section header and the footer
 * row, not the URL. `/ai-method` matches the footer label he pointed at. Flagged in
 * the `E356` report — renaming this folder is a one-line change plus the `href` in
 * `footer-videos.ts`.
 */

/*
  ⚠⚠ CHAT DID NOT DRAFT MARKETING COPY. Both strings come from the component's own
  LIVE text — its renamed eyebrow and the five lobe names it already shows — so
  nothing here can drift from what the page renders.
  ⚠ REPORTED VERBATIM IN THE `E356` REPORT so Scott can replace either; it is
  metadata, not approved copy.
*/
export const metadata: Metadata = {
  title: "AIM — The AI Method — Panameer",
  description:
    "Define, Design, Develop, Decide, Deploy — the five-stage AI Method " +
    "behind Panameer's continuous transformation cycle.",
};

export default function AiMethodPage() {
  return (
    <>
      {/* ⚠ OUTSIDE `.pm-home` — see the header note in the block above. */}
      <MarketingHeader />
      <div className="pm-home">
        <MethodologyRing />
      </div>
      {/* ⚠ OUTSIDE `.pm-home` — see the footer note in the block above. */}
      <MarketingFooter />
    </>
  );
}
