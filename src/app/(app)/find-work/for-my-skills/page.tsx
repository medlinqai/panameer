import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ THIS VIEW ALREADY EXISTS. IT IS A TAB. (`P2-ALL-E708`) ──────────────
 *
 * ⚠⚠ **`E216` FOLDED THE RAIL'S FIVE FIND-WORK CHILDREN INTO `/find-work`'s TAB
 * ROW AND DE-DUPLICATED THEM**, in `work-feed.ts`'s own words: *"'Work Requests
 * for My Skills' IS Best Matches (this feed ranks by skill overlap), 'All Work
 * Requests' IS Most Recent, 'My Work Requests (Saved)' IS Saved Work, and
 * 'Invitations to Propose My Rate' IS Invitations."*
 *
 * ⚠⚠⚠ **SO BUILDING THIS PAGE WOULD BE A SECOND IMPLEMENTATION OF A VIEW THAT
 * ALREADY WORKS — `E585`, and the exact duplication `E216` removed on purpose.**
 * The feed ranks by skill overlap in `getWorkFeed({ tab: "best" })`; a page here
 * would either call the same function (two doors, one view, drifting apart) or
 * rank again (two matchers — what the brief forbids in the same breath).
 *
 * ── ⚠⚠ WHY A REDIRECT AND NOT A DELETION ───────────────────────────────────
 *
 * ⚠ **THE MENU STILL NAMES THIS URL** — `nav.ts:1105`. Deleting the route would
 * 404 a live menu item, which is the thing the placeholder existed to prevent.
 * ⚠⚠ **`redirect`, NOT `permanentRedirect`, AND THAT IS DELIBERATE:** Scott is
 * about to walk these journeys and may rule that this should be a page after all.
 * A 308 is cached hard by the browser, so **a reversal would look broken on his own
 * machine.** A 307 costs one hop and keeps the decision reversible.
 * ⚠ **THE GUARD RUNS FIRST, COPYING `/connect`:** redirecting an unauthorised
 * visitor first would challenge them on `/find-work`, and the callback URL would
 * name the wrong page.
 *
 * ⚠⚠ **REPORTED, NOT FIXED — THE LABEL AND THE TAB DISAGREE.** This menu item says
 * *"Work Requests for My Skills"* and lands on a tab labelled *"Best Matches"*, so
 * ruling 95's check 1 (the name the member clicked matches the name they arrive at)
 * is **not** satisfied by this redirect. ⚠⚠⚠ **RECONCILING THEM IS A MENU-NAMING
 * DECISION AND MENU NAMES ARE SCOTT'S** (`E533`, and the 2026-09-23 vocabulary
 * ruling). The two directions are: rename the four menu children to the tab labels,
 * or rename the tabs to the menu children. **Not chosen here.**
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what this file used to be and why:
 * //   Work Requests for My Skills - a titled placeholder (WS1-B).
 * //   The rail's submenu names this view, so it has to LAND somewhere. A 404 from
 * //   your own menu reads as a broken product; a titled empty state reads as one
 * //   that hasn't got there yet, which is the truth. The route, its title and its
 * //   gate are real - only the content is pending.
 * //   export const metadata = { title: "Work Requests for My Skills · Panameer" };
 * //   return <ComingSoon title="Work Requests for My Skills" />;
 * ⚠⚠ **ITS REASONING WAS RIGHT AND ITS PREMISE EXPIRED:** the content is no longer
 * pending, so the menu item can now land on the real thing instead of a card that
 * says it does not exist yet.
 */
export default async function Page() {
  await guardPage("canProvideServices");
  redirect("/find-work?tab=best");
}
