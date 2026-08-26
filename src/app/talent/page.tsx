import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { TalentHero } from "@/components/marketing/TalentHero";
import { TalentSpine } from "@/components/marketing/TalentSpine";

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
      <TalentHero />
      {/*
        ⚠ THE SPINE SITS DIRECTLY UNDER THE HERO (P1-J1-E012), before ThreeWays —
        the five steps are how the page explains itself, so they come before the
        comparison. Its panels are EMPTY by instruction; brief_talent_spine_panels
        fills them.
      */}
      <TalentSpine />
      {/*
        ── ⚠⚠ THE PAGE ENDS HERE NOW (`P1-J1-E030`) ─────────────────────────

        `ValueStack`, `VideoSequence` and `AppShots` MOVED to `/` — moved, not
        copied, and they must not render here. Scott: *"i do not think we will
        need them, but i will leave them on the last page to get refined for
        now."* `/` is a PARKING PLACE for them, not a new home.

        ⚠ SO `/talent` ENDS ON THE SPINE + THE HERO'S COUNTER TILES, WITH NO
        CLOSING CTA. That is `P1-J1-E023`, still open, and NO CLOSING SECTION WAS
        INVENTED to fill the gap — the hero's `Join Panameer & Create My Profile`
        is the page's only ask.
      */}
      {/*
        ── ⚠ `ThreeWays` AND `AiMatch` MOVED TO `/find-work` (`P1-J4-E005`) ──────

        `P1-J4-E002` settled that Work is the BUYER's page, and both sections are
        buyer content. ⚠ THAT WITHDRAWS `P1-J1-E021`'s RECOMMENDATION to RETIRE them:
        it was made because four of six pillars had gone provider-facing and the
        buyer's hiring story had no page. It has one now.

        ⚠ `AiMatch`'s HEADLINE IS THE WHOLE REASON — *"Post what you need. Get
        ranked, vetted experts."* was a BUYER sentence stranded under a SELLER
        headline, which is `P1-J1-E019`. On a buyer page it is finally in the right
        place. ⚠ `E019` IS CLOSED BY RELOCATION for that half; the hero lockup half
        stays open.

        ⚠ `E164`: both stay on disk and both now render on `/find-work`.
      */}
      {/*
        ── ⚠⚠ THREE SECTIONS LEFT THIS PAGE (`P1-J1-E020`, `P1-J1-E022`) ────────

        `ErpPunchout` -> `/enterprise` (Integrate). Scott: *"This needs to be moved
        to INTEGRATE."* It rejoins `ErpIntegration` there, and it IS the Integrate
        story by definition — `integration_model.md` describes the services
        procurement chain this section draws.

        `FourBeats` and `ClosingCta` -> deleted from here. Scott: *"REMOVE both of
        these."*

        ⚠ `E164`: all three stay ON DISK. `FourBeats` and `ClosingCta` both still
        serve `/find-work`; `ErpPunchout` now renders on `/enterprise`.

        ⚠ `ClosingCta audience="buyer"` WAS A BUYER CTA CLOSING A SELLER PAGE —
        *"Describe what you need"* / *"Talk to us"*. Its removal is consistent with
        `P1-J1-E013`, not merely a deletion.

        ⚠⚠ BUT IT WAS THIS PAGE'S CLOSING CALL TO ACTION AND NOTHING REPLACES IT.
        The page now ends on `AppShots`, which is a product-screenshot band with no
        action in it. `/hire-talent` therefore has NO closing CTA at all, and its
        only remaining control anywhere is the hero search box. ⚠ SCOTT HAS NOT
        NAMED A REPLACEMENT — reported, not invented.

        ⚠ `FourBeats` LEAVING PARTLY CLOSES `P1-J1-E019`: it was the expansion of
        `LEARN. CONNECT. CREATE. SETTLE.`, four verbs against a five-step spine with
        `Settle` where the spine says `Sell`. ⚠ THE HERO'S LOCKUP LINE STILL SAYS IT
        AND STILL CONFLICTS — that half stays open.
      */}
    </MarketingShell>
  );
}
