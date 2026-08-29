import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { CapabilityFramework } from "@/components/marketing-home/CapabilityFramework";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

/**
 * `/capability-domains` — THE CAPABILITY FRAMEWORK AT ITS OWN ADDRESS (`P1-J0-E352`).
 *
 * Scott, 2026-08-28: *"Point it to a page with the full graphic of image 1 (but
 * sized correctly)."* Image 1 was `CapabilityFramework`. The `/optimize` hero's
 * second button — `CAPABILITY_EXPLAINED_LABEL` — is the only thing that links here.
 *
 * ── ⚠⚠ THIS PAGE IS THE ONLY PLACE `CapabilityFramework` RENDERS (`P1-J0-E355`) ──
 *
 * ⚠ IT WAS BUILT AS A COPY AND BECAME A MOVE, and the sequence is worth keeping
 * because the copy decision was CORRECT ON THE EVIDENCE AT THE TIME:
 *   · `E350`/`E351` — Scott walked `/` three times and named eighteen sections to
 *     delete. This one was on NONE of those lists, so both briefs gated on it
 *     SURVIVING on `/`.
 *   · `E352` — built this route and was explicit that it ADDED a second render site,
 *     gating `app/page.tsx` byte-identical for exactly that reason.
 *   · `E355` — Scott named it: *"REMOVE this SECTION from the HOME page."* The `/`
 *     render and its import went, and the copy became a move.
 *
 * ⚠ SO THE SECTION NOW HAS ONE HOME AND THIS IS IT. `/optimize`'s second hero
 * button (`CAPABILITY_EXPLAINED_LABEL`) is the only thing that links here, and it
 * still works — verified at `E355` by clicking it, not by reading the href.
 * ⚠ SUPERSEDED, quoted not deleted, so nobody restores the `/` render from it: this
 * header used to read *"THIS IS A COPY, NOT A MOVE. `CapabilityFramework` STILL
 * RENDERS ON `/`"* and *"DO NOT DE-DUPLICATE THE TWO by removing it from `/`."*
 * That instruction is HISTORY and was reversed by its owner.
 *
 * ⚠ `§50 no public page renders the same section twice` was never the constraint
 * here, and that was checked against the test body rather than assumed: it loops a
 * list of URLs and, PER PAGE, rebuilds its `seen` map to look for a duplicate `id`
 * or a repeated `<h2>` WITHIN that page. It could not have failed on two pages each
 * rendering the section once, and after `E355` only one page does.
 * ⚠ THIS ROUTE IS IN ITS URL LIST and stays there — the test's own docblock says
 * *"RUN ON EVERY PUBLIC MARKETING PAGE"*. Widening it was strictly stronger and
 * nothing was loosened.
 *
 * ── ⚠⚠ THE STRUCTURE IS NOT A FREE CHOICE — IT IS `/optimize`'s, EXACTLY ────────
 *
 * `CapabilityFramework` renders `.block fw`, `.wrap`, `.fw-head`, `.fw-top`,
 * `.tabs`, `.fw-body` and `.eyebrow`. EVERY ONE of those is defined in `home.css`
 * under the `.pm-home` scope — `.pm-home .wrap`, `.pm-home .fw-top` and so on.
 * Without BOTH the stylesheet import above AND the wrapper below, this page renders
 * an unstyled stack of divs. ⚠ THAT IS THE `.pm-home` TRAP AND IT HAS COST THIS
 * PROJECT SIX DEFECTS. It was verified here by screenshotting the page at 1440 and
 * 1160 and looking at the pixels, not by reasoning about the class list.
 *
 * ⚠ THE HEADER AND FOOTER SIT OUTSIDE THE WRAPPER, and that is load-bearing in both
 * directions:
 *   · `home.css` carries the mockup's `*{margin:0;padding:0}` reset. Scoped to
 *     `.pm-home *` it strips `MarketingHeader`'s Tailwind spacing (`P1-ALL-E020`).
 *   · `P1-ALL-E020` also measured the footer INSIDE the wrapper: its inherited
 *     colour was repainted `#cfc7da` -> `#aeb4cf` and it stood 910px on five pages
 *     and 1008px on another. One component in two colours and two heights is exactly
 *     what "one footer, every public page" was meant to end.
 * ⚠ IT IS THE MIRROR OF `P1-ALL-E013`, where `HomeFooter` was fixed by *adding*
 * `.pm-home`. That footer needed the scope; this one has to escape it.
 *
 * ── ⚠ NO PAGE FURNITURE, DELIBERATELY ──────────────────────────────────────────
 *
 * No hero, no heading, no lede, no breadcrumb, no back-link, no closing CTA. Scott
 * asked for a page with the graphic on it, and the component already carries its own
 * eyebrow (`The Framework`) and `<h2>` (`Optimize by Capability Domain`). ⚠ Inventing
 * page copy here would be chat writing marketing text he has not seen.
 *
 * ── ⚠ "SIZED CORRECTLY" — NO NEW WIDTH WAS INVENTED ────────────────────────────
 *
 * `.pm-home .wrap` is `max-width:1200px; padding:0 32px` and `.pm-home .fw-head` is
 * `max-width:1200px`. On `/` the framework is one section among several; here it has
 * the viewport to itself with nothing competing, which is most of what the phrase
 * asks for. ⚠ IT SHIPS AT THE EXISTING 1200 and the rendered width is in the `E352`
 * report. If Scott wants it wider he will name a number, and that is a PAGE-LOCAL
 * override here — NOT an edit to `.pm-home .wrap`, which 21 other sections use.
 * ⚠ `home.css` WAS NOT EDITED. Not one rule.
 *
 * ⚠ THE ROUTE NAME IS CHAT'S, NOT SCOTT'S. He named the button, not the URL. It
 * matches `src/lib/capability-domains.ts`, where the data already lives. Flagged in
 * the report — renaming this folder is a one-line change plus the `href` in
 * `optimize/page.tsx`.
 */

/*
  ⚠⚠ CHAT DID NOT DRAFT MARKETING COPY FOR THIS. Both strings are the component's own
  LIVE STRINGS, read out of `CapabilityFramework.tsx` — the `<h2>` and the sentence
  the section already shows — so nothing here can drift from what the page renders.
  ⚠ REPORTED VERBATIM IN THE `E352` REPORT so Scott can replace either one; it is
  metadata, not approved copy.
*/
export const metadata: Metadata = {
  title: "Optimize by Capability Domain — Panameer",
  description:
    "The ten capability domains behind the Panameer assessment, and the " +
    "Capability Domain Scorecard it produces.",
};

export default function CapabilityDomainsPage() {
  return (
    <>
      {/* ⚠ OUTSIDE `.pm-home` — see the header note in the block above. */}
      <MarketingHeader />
      <div className="pm-home">
        <CapabilityFramework />
      </div>
      {/* ⚠ OUTSIDE `.pm-home` — see the footer note in the block above. */}
      <MarketingFooter />
    </>
  );
}
