import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { ThreeWays } from "@/components/marketing/sections/ThreeWays";
import { AiMatch } from "@/components/marketing/sections/AiMatch";
import { ValueStack } from "@/components/marketing/sections/ValueStack";
import { ErpPunchout } from "@/components/marketing/sections/ErpPunchout";
import { VideoSequence } from "@/components/marketing/VideoSequence";
import { AppShots } from "@/components/marketing/sections/AppShots";
import { FourBeats } from "@/components/marketing/sections/FourBeats";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";
import { HIRE_HERO } from "@/lib/brand";

/**
 * HIRE TALENT — the buyer who is ready to hire (brief_public_pages_ia WS-2).
 *
 * ── ASSEMBLED, NOT WRITTEN ───────────────────────────────────────────────────
 *
 * Almost nothing here is new. The talent search, ThreeWays, ValueStack,
 * ErpPunchout and VideoSequence all lived on `/` and moved here intact; only
 * `AiMatch` and `AppShots` are new components. That is the point of the brief:
 * the content was right and its ADDRESS was wrong.
 *
 * ── WHY THESE SECTIONS AND NOT THE HOME'S ────────────────────────────────────
 *
 * Everything on this page answers a question somebody asks AFTER deciding to
 * hire — how do I find the right person, what does it cost me in risk, how does
 * it reach my ERP. On the home those were answers to questions the reader had
 * not asked yet, arriving before the assessment that would have made them care.
 *
 * ERP punchout in particular belongs here and nowhere else: it is the deepest
 * enterprise content on the site, and it was sitting third on a page whose job
 * is to convert a cold decision-maker with an email address.
 *
 * ── ORDER ────────────────────────────────────────────────────────────────────
 *
 *   hero        search — you came here to find someone, so start there
 *   three ways  the honest comparison, full version with its tick lists
 *   AI match    how the right expert is actually found
 *   value stack what procurement will ask you
 *   punchout    how it reaches your ERP
 *   sequence    the four beats as video
 *   app shots   what you'd actually be using   (placeholders — see AppShots)
 *   four beats  Learn · Connect · Create · Settle, for a buyer
 *   closing     search / post / sign up
 *
 * Server components throughout, so this route prerenders static.
 */
export const metadata: Metadata = {
  title: "Hire Pre-Vetted Oracle & Enterprise Experts, Direct — Panameer",
  description:
    "Search real, rated experts by the system they actually run. Engage for " +
    "two hours or six months — one contract, one payment, no employment risk " +
    "— and punch out for services straight from your ERP.",
};

export default function HireTalentPage() {
  return (
    <MarketingShell page="hire">
      <MarketingHero
        audience="buyer"
        kicker={HIRE_HERO.kicker}
        headline={HIRE_HERO.headline}
      />
      <ThreeWays />
      <AiMatch />
      <ValueStack />
      <ErpPunchout />
      <VideoSequence audience="buyer" />
      <AppShots page="hire" />
      <FourBeats page="hire" />
      <ClosingCta audience="buyer" />
    </MarketingShell>
  );
}
