import { PROVIDER_NAV } from "@/lib/nav";

/**
 * The Community section, as data (brief_MASTER_rails_and_community PHASE 2).
 *
 * THE HUB AND THE RAIL READ ONE LIST. The four sections are already declared in
 * `nav.ts` as the Community item's `children`; re-typing them here would be the
 * exact drift the shared nav module exists to stop — a hub card and a submenu
 * entry pointing at different places, or worse, the hub silently missing a
 * section somebody added to the rail.
 *
 * What this file adds is the part a nav entry has no room for: what each
 * section is FOR, in a sentence, and whether it is real yet. The hub is a front
 * door, and a front door that only lists names is a worse front door than the
 * menu you came from.
 */

export type CommunitySection = {
  label: string;
  href: string;
  blurb: string;
  /**
   * Honest status, shown on the card.
   *
   * `live` means the section does its job today. `early` means the surface is
   * real and reads real data but the feature behind it lands later — that is
   * true of Find a Mentor, whose cards are real providers and whose Book button
   * waits on PHASE 4. Nothing here is allowed to look finished when it isn't.
   */
  state: "live" | "early";
};

/** The blurbs, keyed by the href the rail already declares. */
const BLURBS: Record<string, { blurb: string; state: CommunitySection["state"] }> = {
  "/messages": {
    blurb:
      "Direct conversations with buyers and the people you work with.",
    state: "early",
  },
  "/community/forums": {
    blurb:
      /* ⚠ CREDITS CLAUSE PARKED 2026-09-03 (`P1-ALL-E375`). ONE COMPLETE
         SENTENCE REMOVED, NOT REWRITTEN — the blurb read *"Ask questions, answer
         them, and be seen doing it. Posting earns Community Credits."* What is
         left is the original first sentence, untouched. NO NEW COPY WAS WRITTEN. */
      "Ask questions, answer them, and be seen doing it.",
    state: "live",
  },
  "/community/teams": {
    blurb:
      "The providers you represent, and the recruiter who represents you.",
    state: "live",
  },
  "/community/mentors": {
    blurb:
      "Senior practitioners offering 15-minute sessions — the fastest way to unblock something.",
    state: "early",
  },
};

/**
 * The four sections, in the order the rail lists them.
 *
 * Falls back to a neutral blurb rather than throwing if the rail gains a fifth
 * child before this file knows about it: a hub missing a description is a small
 * problem, a hub that crashes is not.
 */
export function communitySections(): CommunitySection[] {
  const community = PROVIDER_NAV.find((i) => i.href === "/community");
  return (community?.children ?? []).map((child) => ({
    label: child.label,
    href: child.href,
    blurb: BLURBS[child.href]?.blurb ?? "",
    state: BLURBS[child.href]?.state ?? "early",
  }));
}

/**
 * How Credits are earned and what they buy, in the platform's own words.
 *
 * THE DOOR-LINE, SAID PLAINLY. The strategy is that group sessions are earned
 * rather than free — an active member accrues enough to attend, a passive one
 * does not. That only works if the rule is legible: a currency nobody
 * understands is a currency nobody chases. So the hub states the earn actions
 * and the spend, in order, before anyone has a balance to look at.
 *
 * VALUES ARE DELIBERATELY ABSENT. `CREDIT_RULES` lands in PHASE 3 and is the
 * single place the numbers will live; printing "100 Credits" here would create
 * a second source that drifts the moment Scott tunes the first. Each line says
 * WHAT earns, not how much.
 */
/* ⚠⚠ THE CREDITS EARN/SPEND TABLES — PARKED 2026-09-03 (`P1-ALL-E375`, brief
   amendment A2). ⚠ COMMENTED OUT, NOT DELETED.

   SCOTT, 2026-09-03: *"just comment it out. we can come back to it if we want,
   but it is just too much rn. we NEED to move faster. that has no real value."*

   ⚠ PARKED DELIBERATELY, NOT ABANDONED — no ledger, no scheduling, and a
   standing Friday commitment nobody wants. The decision and every parked call
   site are listed in `src/lib/credits.ts`. Their only consumer was the Credits
   card on `/community`, which is parked in the same commit.

   ⚠ THE DOCBLOCK ABOVE STAYS LIVE AND STILL EARNS ITS PLACE: it records why the
   VALUES ARE DELIBERATELY ABSENT — *"printing '100 Credits' here would create a
   second source that drifts the moment Scott tunes the first"*. That is the rule
   to re-read before anyone rebuilds this, so it is not buried in the comment. */
// export const CREDIT_EARN_ACTIONS: { action: string; detail: string }[] = [
//   {
//     action: "Finish your profile",
//     detail: "A complete profile earns a one-off grant — and gets you found.",
//   },
//   {
//     action: "Complete a course",
//     detail: "Every Learn course you finish pays out once.",
//   },
//   {
//     action: "Answer in the forums",
//     detail: "Posting and replying earns a little back each time.",
//   },
//   {
//     action: "Respond to work requests",
//     detail: "Replying to a buyer's request earns, whether or not you win it.",
//   },
//   {
//     action: "Bring someone in",
//     detail: "When a person you invited signs up, you both benefit.",
//   },
// ];
//
// export const CREDIT_SPEND_ACTIONS: { action: string; detail: string }[] = [
//   {
//     action: "A seat at a Friday group session",
//     detail:
//       "Thirty minutes with a senior practitioner, one-to-many. Seats are earned, not sold.",
//   },
// ];
//