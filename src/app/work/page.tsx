import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { FindWorkHero } from "@/components/marketing/FindWorkHero";
import { WorkSpine } from "@/components/marketing/WorkSpine";

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
 * ⚠ THE OLD CLAIM HERE — *"every section is a server component, so this route
 * carries no client JS at all"* — WAS ALREADY FALSE BEFORE THIS BRIEF, and it is
 * corrected rather than carried forward: `MarketingShell` renders
 * `MarketingHeader` and this page's own hero renders `HeroTwoUp`, both client
 * components. What is true, and what the gate actually checks, is that the route
 * still PRERENDERS STATIC (`○`) — a client component is prerendered too, and a
 * route only loses `○` when it reads request-time data.
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
      {/*
        ── ⚠⚠ ELEVEN SECTIONS LEFT THIS PAGE (`P1-J4-E023`) ──────────────────

        Scott: *"there are MULTIPLE sections between the steps and the footer that
        are supposed to have been moved to the HOME page. Please move those."*

        ⚠ NINE MOVED TO `/`, IN THIS ORDER: `ThreeWays`, `AiMatch`, `TwoPains`,
        `OmniChannel`, `GoDirectBionic`, `ProfileViz`, `FourBeats page="work"`,
        `AiStrip audience="provider"`, `ClosingCta audience="provider"`. MOVED, NOT
        COPIED — a parking place, not a redesign.

        ⚠⚠ TWO WERE DELETED RATHER THAN MOVED, AND THAT IS A REAL LOSS TO STATE
        PLAINLY. `VideoSequence audience="provider" tone="soft"` and
        `AppShots page="work"` are the SAME COMPONENTS `/` already renders with
        DIFFERENT PROPS — `walk-fixes` WS1 put `audience="buyer"` and `page="hire"`
        there. Adding the provider/work copies would have put two of each on one
        page, so they were dropped and `/`'s buyer/hire instances kept.
        ⚠ THE `provider` / `work` VARIANTS NOW RENDER NOWHERE ON THE SITE. Both
        components still support the props; nothing calls them. Reported, not
        discovered.

        ⚠ SEVEN OF THE ELEVEN WERE `audience="provider"` SECTIONS ON THE BUYER'S
        PAGE — the mis-audiencing filed as `P1-J4-E005`. Moving them CLOSES that,
        and it is the real reason they went.

        ⚠⚠ THE PAGE NOW ENDS ON `WorkSpine`, WITH NO CLOSING CTA. `ClosingCta` was
        it. NO REPLACEMENT WAS INVENTED — the hero's `Create a Work Request` is the
        page's only ask, and that gap is reported.
      */}
    </MarketingShell>
  );
}
