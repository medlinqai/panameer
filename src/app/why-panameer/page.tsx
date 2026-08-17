import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { MarketingHero } from "@/components/marketing/MarketingHero";
import { MethodologyRing } from "@/components/marketing-home/MethodologyRing";
import { Testimonials } from "@/components/marketing-home/Testimonials";
import { WHY_HERO } from "@/lib/brand";
import "@/components/marketing-home/home.css";

/**
 * /why-panameer — the method, then the proof (brief_public_ia_block2 WS-3).
 *
 * ── A DESTINATION, BUILT BEFORE ANYTHING MOVES ───────────────────────────────
 *
 * Both sections ALSO still render on `/`. Nothing comes off Home until its
 * destination exists; block 3 does the removal. The duplication is intended and
 * temporary.
 *
 * ── ORDER: METHOD BEFORE PROOF ───────────────────────────────────────────────
 *
 * The brief's order, and it is the right way round: the ring explains HOW
 * Panameer works, and the testimonials are people saying it worked. Proof
 * before method is a wall of quotes about a thing the reader cannot yet picture.
 *
 * ── ⚠ THE TESTIMONIALS ARE PLACEHOLDER CONTENT AND STAY THAT WAY ─────────────
 *
 * The twelve real shoots are E093/E094 and blocked on Scott. This section moves
 * AS-IS: not improved, not replaced, not hidden. Its unfinished state is tracked
 * as a walk error, and quietly "fixing" it here would lose that tracking while
 * leaving the same problem on `/`, which renders the same component.
 *
 * ── ⚠ THE `.pm-home` WRAPPER IS LOAD-BEARING ─────────────────────────────────
 *
 * Both sections are styled entirely by `.pm-home`-prefixed rules in `home.css`,
 * and `MarketingShell` provides no such scope. MEASURED, not assumed — strip the
 * class and `.block h2` drops from 44px to 16px and loses its 720px measure.
 *
 * Inside the shell, around the PAYLOAD ONLY. Verified: `header`, the hero `h1`
 * and `footer` all resolve `closest(".pm-home") === null`.
 *
 * ⚠ `ThreeWays` stays on `/hire-talent` and `#three-ways` stays a valid anchor.
 * This page changes where the FOOTER LINK points; it does not move that section.
 *
 * Server component throughout, so this route prerenders static.
 */
export const metadata: Metadata = {
  title: "Why Panameer — the method, and the people who ran it",
  description:
    "A firm's methodology and a managed engagement, delivered by a distributed " +
    "network of senior experts instead of a salaried pyramid.",
};

export default function WhyPanameerPage() {
  return (
    <MarketingShell>
      <MarketingHero
        audience="buyer"
        kicker={WHY_HERO.kicker}
        headline={WHY_HERO.headline}
      />
      {/* The scope for the ported stylesheet, around the payload only. */}
      <div className="pm-home">
        <MethodologyRing />
        <Testimonials />
      </div>
    </MarketingShell>
  );
}
