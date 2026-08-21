import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HomeHero } from "@/components/marketing-home/HomeHero";
import { HowItWorks } from "@/components/marketing-home/HowItWorks";
import { OptimizeSteps } from "@/components/marketing-home/OptimizeSteps";
import { HomeFooter } from "@/components/marketing-home/HomeFooter";
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
 * It reads no cookies and calls no `getSessionViewer()`. The five steps are
 * NATIVE `<details>`, so the whole page is a Server Component with no client
 * island at all — a hand-built accordion would have needed `"use client"` and
 * would have cost the static render for behaviour the browser already gives
 * away. `HomeHero` and the graphics are the same components `/` uses, and `/`
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
        {/* ⚠ ONE WORD-GROUP DIFFERENT FROM `/`. See the note on `HomeHero`. */}
        <HomeHero ctaLabel="Start the Assessment" />
        {/* ⚠ Heading and lede only — the card strip is E242. See above. */}
        <HowItWorks showStrip={false} />
        <OptimizeSteps />
        <HomeFooter />
      </div>
    </>
  );
}
