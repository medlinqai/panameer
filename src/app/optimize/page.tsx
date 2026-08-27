import type { Metadata } from "next";
import { OPTIMIZE_CTA_LABEL } from "@/lib/spine-steps";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { HowItWorks } from "@/components/marketing-home/HowItWorks";
import { OptimizeSteps } from "@/components/marketing-home/OptimizeSteps";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import "@/components/marketing-home/home.css";

/**
 * `/optimize` — THE ASSESSMENT JOURNEY, AT ITS OWN ADDRESS (P1-J0-E259).
 *
 * ── ⚠ THIS PAGE IS ADDITIVE. `/` IS NOT TOUCHED ─────────────────────────────
 *
 * Scott's rule, the same one `/enterprise` shipped under: a destination exists
 * and renders before anything comes off Home. So the spine still renders on `/`
 * as well, and NOTHING IS MISSING FROM THE SITE MID-SEQUENCE.
 *
 * ⚠ THE TWO ROUTES THEREFORE CARRY THE SAME FIVE STEPS FOR A SHORT WINDOW. THAT
 * IS DELIBERATE AND TIME-BOXED — the home rebuild removes the spine from `/` in a
 * separate, later brief, blocked on copy Scott has not written yet. ⚠ DO NOT
 * "FIX" IT BY DELETING EITHER ONE.
 *
 * ── ⚠ WHY IT PRERENDERS `○`, AND WHAT WOULD SPEND THAT ──────────────────────
 *
 * It reads no cookies and calls no `getSessionViewer()`. THAT is what keeps it
 * `○` — a route leaves the static column when it reads REQUEST-TIME data, and
 * this one reads none.
 *
 * ⚠ THIS NOTE USED TO SAY A CLIENT ISLAND WOULD HAVE "COST THE STATIC RENDER",
 * AND THAT WAS WRONG. Measured 2026-08-21: `"use client"` was added to
 * `StepDisclosures` and `npm run build` still printed `○ /optimize`. Next
 * prerenders client components too. The five steps being native `<details>`
 * saves the JS BUNDLE and the hydration, not the route mode — a real saving, and
 * not the one this paragraph claimed. `check:ui` §31 asserts the directive's
 * absence directly for exactly that reason. `HomeHero` and the graphics are the same components `/` uses, and `/`
 * prerenders too, so nothing here is new in that respect. Check the build's
 * route table rather than assuming.
 *
 * ── WHAT IS DIFFERENT FROM `/`, AND IT IS TWO THINGS ────────────────────────
 *
 *   · the hero's CTA reads `Start the Assessment` (`/` keeps its own label)
 *   · `HowItWorks`' five-card strip does NOT render — `P1-J0-E242`. Once the
 *     five steps ARE the list, the cards are a second telling of the same five
 *     things from a second array in different words, which is exactly what that
 *     row records. The heading and the lede stay.
 */
export const metadata: Metadata = {
  title: "Optimize Your Business with AI — Panameer",
  description:
    "See where AI moves the needle in your business: a free maturity " +
    "assessment, an optimization dashboard, and a 1-year AI Roadmap built " +
    "with an expert.",
};

export default function OptimizePage() {
  return (
    <>
      {/*
        ⚠ THE HEADER SITS OUTSIDE `.pm-home`, for the reason recorded on `/`:
        the ported stylesheet carries the mockup's `*{margin:0;padding:0}` reset,
        and scoped to `.pm-home *` it strips `MarketingHeader`'s Tailwind
        spacing. Same structure here, deliberately, not by copy-paste accident.
      */}
      <MarketingHeader />
      <div className="pm-home">
        {/*
          ⚠ ONE WORD-GROUP DIFFERENT FROM `/`. See the note on `HomeHero`.

          ⚠ THE LONG LABEL SHIPPED, NOT SCOTT'S FALLBACK, AND IT WAS MEASURED
          RATHER THAN CHOSEN. `Start Your Free Optimization Assessment` is 39
          characters against the previous 20; his fallback `Start Your Free
          Assessment` applies ONLY if the long one does not fit. It fits at every
          width — see the report — so the short one was not taken for tidiness.
        */}
        {/*
          ── ⚠⚠ SCOTT-APPROVED DESCRIPTION (`P1-ALL-E031` amendment §3) ────────────

          ⚠ CHAT DRAFTED IT, SCOTT APPROVED IT. Not a draft marker — it is approved.
          ⚠ THE QUOTED LABEL IS THE SAME STRING AS `ctaLabel` ONE LINE ABOVE, which is
          why both come from `OPTIMIZE_CTA_LABEL` rather than being typed twice —
          `P1-J4-E024` is exactly this defect shipping for real on `/work`.
          ⚠ `/` KEEPS ITS OWN DESCRIPTION. See the note at `app/page.tsx`; these two
          pages are one component and that is why the prop exists.
          ⚠ THIS PAGE ALSO GAINED THE BRIDGE LINE — it was the only one of seven
          missing it, and it comes with the shared treatment now.
        */}
        <HomeHero
          ctaLabel={OPTIMIZE_CTA_LABEL}
          description={
            <>
              Click the &ldquo;{OPTIMIZE_CTA_LABEL}&rdquo; button, see where you
              stand, and build your 12-month AI roadmap with an expert.
            </>
          }
        />
        {/* ⚠ Heading and lede only — the card strip is E242. See above. */}
        <HowItWorks showStrip={false} />
        <OptimizeSteps />
      </div>
      {/*
        ── ⚠⚠ THE FOOTER SITS OUTSIDE `.pm-home`, AND THAT IS LOAD-BEARING ────

        `P1-ALL-E020` measured it: inside the wrapper, `home.css` repainted the
        footer's inherited colour from `#cfc7da` to `#aeb4cf`, and the footer stood
        910px tall on five public pages and 1008px on this one. ⚠ ONE COMPONENT
        RENDERING IN TWO COLOURS AND TWO HEIGHTS IS EXACTLY WHAT "one footer, every
        public page" WAS MEANT TO END.

        ⚠ IT IS THE MIRROR OF `P1-ALL-E013`, WHICH `HomeFooter` FIXED BY *ADDING*
        `.pm-home`. That footer NEEDED the scope because its styles live in
        `home.css`; this one is Tailwind and has to ESCAPE it. Same trap, opposite
        ends.
      */}
      <MarketingFooter />
    </>
  );
}
