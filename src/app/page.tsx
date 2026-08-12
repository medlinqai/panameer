import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { AssessmentHero } from "@/components/marketing/AssessmentHero";
import { Assessment } from "@/components/marketing/sections/Assessment";
import { RoadmapPreview } from "@/components/marketing/sections/RoadmapPreview";
import { ThreeWays } from "@/components/marketing/sections/ThreeWays";
import { FourBeats } from "@/components/marketing/sections/FourBeats";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";

/**
 * THE HOME — the assessment front door (brief_public_pages_ia WS-1).
 *
 * ── ONE AUDIENCE, ONE JOB ────────────────────────────────────────────────────
 *
 * `/` used to do three jobs at once: talent search, buyer value and the
 * assessment. Every visitor met two thirds of a page written for somebody else,
 * and the one asset that could start a conversation with a cold decision-maker
 * — the maturity assessment — was buried at the bottom under six sections about
 * hiring.
 *
 * The home now serves the service buyer / decision-maker, and its job is:
 * learn where you stand → give us your email. Nothing else competes with that.
 *
 * ── WHAT MOVED OUT, AND WHERE IT WENT ────────────────────────────────────────
 *
 *   talent search + chips  → /hire-talent (its hero)
 *   ErpPunchout            → /hire-talent  (enterprise-buyer content)
 *   ValueStack             → /hire-talent  (procurement's objections)
 *   VideoSequence, AiStrip → /hire-talent
 *
 * Nothing was deleted; six sections changed address.
 *
 * ── FUNNEL ORDER, AND EVERY BLOCK POINTS AT TALENT ───────────────────────────
 *
 *   hero        the offer + what its output looks like
 *   assessment  the framework you'd be scored against
 *   roadmap     what the score turns into — closes on "meet the experts"
 *   three ways  the honest comparison, condensed — closes on "meet the experts"
 *   four beats  Learn · Connect · Create · Settle, in this audience's words
 *   closing     take the assessment
 *
 * The two value blocks in the middle both end by handing off to Hire Talent.
 * That is the whole reason they are still on this page: a home that sells the
 * problem and never names who fixes it has warmed somebody up for nobody.
 *
 * ── STATIC ───────────────────────────────────────────────────────────────────
 *
 * Every section is a server component except the assessment's tab switcher, so
 * this route still prerenders. The hero shows the dashboard without a tab
 * control precisely to keep it that way.
 */
export const metadata: Metadata = {
  title: "See Where Your Business Really Stands — Panameer",
  description:
    "A free operating-maturity assessment, in minutes. See where your " +
    "operations rank from paper to AI-driven — then connect with the vetted " +
    "experts who close the gaps.",
};

export default function Home() {
  return (
    <MarketingShell page="home">
      <AssessmentHero />
      <Assessment />
      <RoadmapPreview />
      <ThreeWays condensed />
      <FourBeats page="home" cta="assessment" />
      <ClosingCta audience="home" />
    </MarketingShell>
  );
}
