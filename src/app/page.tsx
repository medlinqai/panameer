import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Announcement } from "@/components/marketing/Announcement";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Punchout } from "@/components/marketing/Punchout";
import { LearnFree } from "@/components/marketing/LearnFree";
import { Pricing } from "@/components/marketing/Pricing";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

/**
 * Panameer public marketing home. Only reachable on the marketing hosts
 * (panameer.com / www) — every other host redirects `/` into the app. See
 * `src/proxy.ts`. Faithful build of design/home-mockup.html in the brand system.
 */
export default function Home() {
  return (
    /*
      `marketing-surface` locks the light palette here regardless of the app's
      theme choice — see the note in globals.css. Without it the dark theme
      turned this page's text near-white while its white panels stayed white.
    */
    <div className="marketing-surface min-h-screen bg-white font-body text-ink">
      {/*
        E016.6 / D3 — LEARN MOVES TO SECOND. It was fifth, below the punchout
        pitch, which put the one thing on this page that is free, finished and
        usable today underneath two sections describing what the marketplace
        will do. The hero now ends on "Start learning — free" and hands
        straight to it.

        E016.11 — THE SHADING SURVIVED THE MOVE, and no flip was needed. By
        page background the new run looks wrong — soft, white, white, white —
        but two of those sections render full-bleed dark panels, so what is
        actually seen alternates on every boundary:

          magenta ribbon · DARK hero · soft Learn · white How · DARK Punchout ·
          white Pricing · ink footer

        Flipping Pricing to soft was tried and reverted: its Basic card is
        bg-soft specifically so it lifts off a white section (E011), and it
        disappears into a soft one.
      */}
      <MarketingHeader />
      <Announcement />
      <Hero />
      <LearnFree />
      <HowItWorks />
      <Punchout />
      <Pricing />
      <MarketingFooter />
    </div>
  );
}
