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
    <div className="min-h-screen bg-white font-body text-ink">
      <MarketingHeader />
      <Announcement />
      <Hero />
      <HowItWorks />
      <Punchout />
      <LearnFree />
      <Pricing />
      <MarketingFooter />
    </div>
  );
}
