import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Announcement } from "@/components/marketing/Announcement";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ProvidersBrowse } from "@/components/marketing/ProvidersBrowse";
import { Packages } from "@/components/marketing/Packages";
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
        E028 — THE ORDER, AND WHY PACKAGES SITS WHERE IT DOES.

        Hero → Learn → Packages → Providers → How It Works → Punchout →
        Pricing. Learn stays second (it is the one thing here that is free and
        finished). Packages is third because it is Scott's third priority and
        because it is a BUYING MODEL — it belongs beside "browse providers", not
        beside a process explainer. Putting it next to How It Works would read
        as step five.

        E019 — THE SHADING, over the new order. Counting page backgrounds
        misleads here, because the hero and Punchout both render full-bleed dark
        panels regardless of the section behind them. What is actually seen:

          magenta ribbon
          DARK    hero
          soft    Learn
          white   Packages
          white   Providers  ← reads as one white run with Packages
          soft    How It Works
          DARK    Punchout
          white   Pricing
          ink     footer

        Three notes. The hero carries a white bottom gutter so Learn's soft
        band does not butt against the dark panel and swallow its corners.
        Packages and Providers are both white and adjacent —
        deliberate, because they are the two "what can I buy" sections and a
        band between them would imply a bigger break than exists. And Pricing
        stays white because its Basic card is bg-soft precisely so it lifts off
        a white section (E011); flipping it hides the card.
      */}
      <MarketingHeader />
      <Announcement />
      <Hero />
      <LearnFree />
      <Packages />
      <ProvidersBrowse />
      <HowItWorks />
      <Punchout />
      <Pricing />
      <MarketingFooter />
    </div>
  );
}
