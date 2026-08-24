import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { FindWorkHero } from "@/components/marketing/FindWorkHero";
import { WorkSpine } from "@/components/marketing/WorkSpine";
import { ThreeWays } from "@/components/marketing/sections/ThreeWays";
import { AiMatch } from "@/components/marketing/sections/AiMatch";
import { TwoPains } from "@/components/marketing/sections/TwoPains";
import { OmniChannel } from "@/components/marketing/sections/OmniChannel";
import { VideoSequence } from "@/components/marketing/VideoSequence";
import { GoDirectBionic } from "@/components/marketing/sections/GoDirectBionic";
import { ProfileViz } from "@/components/marketing/sections/ProfileViz";
import { AppShots } from "@/components/marketing/sections/AppShots";
import { FourBeats } from "@/components/marketing/sections/FourBeats";
import { AiStrip } from "@/components/marketing/sections/AiStrip";
import { ClosingCta } from "@/components/marketing/sections/ClosingCta";

/**
 * THE SELLER PAGE (brief_home_rebuild_08_09 WS-C).
 *
 * A full mirror of the buyer page — same shell, same hero component, same
 * four-beat sequence, same AI strip and closing band — with the argument turned
 * around. Where the buyer is shown three ways to buy and told the big firm
 * marks the expert up, the seller is shown the two reasons going independent is
 * hard and told they ARE the marked-up expert.
 *
 * Order: pain first (two pains), then the answer to the second one
 * (monetization), then how the platform works from their side (sequence), then
 * the pitch (go direct + bionic), then WHAT YOUR PROFILE BECOMES, then the
 * product, then the four beats, then AI, then the ask.
 *
 * ── WHAT WS-3 ADDED (brief_public_pages_ia) ──────────────────────────────────
 *
 * `ProfileViz` answers the question this page kept raising and never answering.
 * It spends four sections arguing "go direct, be your own brand" — and a
 * provider's immediate next thought is what that brand actually looks like to a
 * buyer. The visual shows the weighted rollup their résumé produces: cumulative
 * time per skill, decayed by recency, plus a centre of gravity across suites.
 * Worth showing precisely because it is the opposite of a self-scored
 * checklist, which is what every other marketplace gives them.
 *
 * `AppShots` and `FourBeats` mirror what Hire Talent carries, so the two
 * audience pages read as one product rather than two microsites.
 *
 * NO ASSESSMENT SECTION. That framework is a buyer diagnostic — capability
 * domains and AI maturity are things an ORGANISATION has — and neither the
 * mockup nor the brief puts it here.
 *
 * Every section is a server component, so this route carries no client JS at
 * all and prerenders static.
 */
export const metadata: Metadata = {
  title: "Sell Your Expertise Direct — Panameer",
  description:
    "Find consistent work and break the hourly ceiling. Sell consultations, " +
    "courses, packages and engagements under your own name — contracts, " +
    "compliance and settlement carried by the platform.",
};

export default function SellerPage() {
  /*
    ── ⚠ NO `page` PROP: THE AUDIENCE STRIP IS GONE (P1-J0-E265) ──────────────

    `MarketingShell` renders `{page && <AudienceStrip …/>}` and only this page and
    its counterpart ever passed it, so dropping the prop is the whole removal —
    `MarketingShell` is not edited and `AudienceStrip.tsx` stays on disk,
    unimported, which is the `E164` resolution.

    ⚠ THIS REVERSES A DELIBERATE DECISION AND THE REASONING IS STILL IN
    `AudienceStrip.tsx`. That file records the control being moved OUT of the hero
    (WS-2a) because there it *"did two unrelated jobs at once: it switched the
    whole page, and it looked exactly like a filter on the search beneath it."*
    ⚠ THAT PROBLEM WAS REAL AND REMOVING THE CONTROL DOES NOT RE-CREATE IT —
    there is no longer a control to be ambiguous. Do not restore the strip from
    that comment.

    ⚠ IT REMOVES THE ONLY BUYER/SELLER SWITCH ON THE PUBLIC SITE. `Talent` and
    `Work` are both top-level nav items now, which arguably IS the switch.
    Reported, not decided.
  */
  return (
    <MarketingShell>
      <FindWorkHero />
      {/*
        ⚠ THE SPINE SITS DIRECTLY UNDER THE HERO (`P1-J4-E006`), before the argument
        sections — the five steps are how the page explains itself, so they come
        before the comparison. Panels are EMPTY by instruction.
      */}
      <WorkSpine />
      {/*
        ── ⚠⚠ `ThreeWays` AND `AiMatch` ARRIVED FROM `/hire-talent` (`P1-J4-E005`) ─

        ⚠ THE ORDER IS DELIBERATE: `ThreeWays` THEN `AiMatch`, and both BEFORE the
        seven provider-facing sections below.

        `ThreeWays` is the buyer's COMPARISON — independents versus consultancies
        versus here. It answers "why this at all", which is the question a buyer has
        before any mechanism matters. `AiMatch` then answers "how do you find me the
        right person", which only lands once the reader has decided to look. That is
        the same general-before-specific ordering `ErpIntegration` -> `ErpPunchout`
        uses on `/enterprise`, and it is the order they already had on
        `/hire-talent`, so neither section moved relative to the other.

        ⚠ THEY GO ABOVE THE SEVEN `audience="provider"` SECTIONS because those are
        now the audience mismatch (`P1-J4-E002`), not the argument. Putting buyer
        sections after them would bury the only copy addressed to the new audience.

        ⚠ `AiMatch` DESCRIBES A FLOW THAT ONLY HALF EXISTS —
        `work-request-match.ts` ranks providers against a `WorkRequest` and works,
        but `/create-work`'s wizard is the only real creation path and `(app)/hire`
        and `(app)/search` are `ComingSoon`. Reported; no copy changed.

        ⚠ `ThreeWays` NEEDED NO CHANGE TO BE CORRECT HERE and was not re-authored.
      */}
      <ThreeWays />
      <AiMatch />
      {/*
        ── ⚠⚠ THE SEVEN SECTIONS BELOW ARE ALL `audience="provider"` ─────────────

        `P1-J4-E002`: *"The audience for WORK are the service buyers."* ⚠ EVERY
        SECTION FROM HERE DOWN ARGUES TO A PROVIDER. That is a page re-point, not a
        hero change, and it is NOT being fixed here: Scott re-pointed the audience,
        he did not author seven replacements, and a section re-written by CC is a
        section he never approved.

        ⚠ ENUMERATED AND REPORTED, UNTOUCHED. See the brief report for what each one
        argues and to whom.
      */}
      <TwoPains /> <TwoPains />
      <OmniChannel />
      <VideoSequence audience="provider" tone="soft" />
      <GoDirectBionic />
      <ProfileViz />
      <AppShots page="work" />
      <FourBeats page="work" />
      <AiStrip audience="provider" />
      <ClosingCta audience="provider" />
    </MarketingShell>
  );
}
