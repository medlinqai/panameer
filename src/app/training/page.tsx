import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { LearnPublic } from "@/components/learn/LearnPublic";

/**
 * `/training` — LEARN'S PUBLIC FRONT DOOR, AT ITS OWN ADDRESS (`P2-ALL-E698` WS-C).
 *
 * ⚠⚠⚠ **SCOTT, 2026-09-28, REJECTING THE SHAPE `/learn` HAD:** *"changing the
 * content based on if logged in seems confusing when someone reports an error with
 * /learn."* ⚠⚠ **ONE URL, ONE PAGE. A BUG REPORT MUST NAME EXACTLY ONE THING.**
 *
 * ⚠ **AND THE APPLICATION KEEPS `/learn`, WHICH IS THE WHOLE POINT:** *"NEVER let a
 * public page steal the best URL."* The public namespace gives way because it is
 * marketing and it is expected to change; `/learn` is what a member learns,
 * bookmarks and quotes.
 *
 * ── ⚠⚠ WHY `/training` AND NOT `/courses` ────────────────────────────────────
 *
 * Scott offered *"training or courses"*. ⚠⚠⚠ **`/learn/courses` ALREADY EXISTS AND
 * IS PUBLIC, so a public `/courses` would make *"the courses page"* ambiguous in
 * exactly the bug report this change exists to disambiguate.** ⚠ Reported rather
 * than assumed — the name is his to overrule, and it is one folder to move.
 *
 * ── ⚠⚠⚠ THIS IS A MOVE, NOT A COPY. `LearnPublic` RENDERS HERE AND NOWHERE ELSE ─
 *
 * ⚠ `E352` built `/capability-domains` as a copy and `E355` had to reverse it one
 * commit later. ⚠⚠ **`/learn` stops rendering `LearnPublic` in WS-C's second
 * commit** — the two commits are separate so that this page exists BEFORE the
 * public branch is taken away, and no capability is ever absent (rule 5).
 *
 * ── ⚠⚠ `MarketingShell`, NOT `learn/layout.tsx`'s ANONYMOUS BRANCH ───────────
 *
 * They render the same chrome — `marketing-surface`, `MarketingHeader`,
 * `MarketingFooter` — and `marketing-surface` is not decoration: it pins the light
 * palette so dark mode cannot turn this page's ink near-white while its white
 * panels stay white. ⚠ `MarketingShell` is where every other public page gets it,
 * so this page joins them rather than keeping Learn's bespoke copy.
 * ⚠ **NO `page` PROP, DELIBERATELY** — that argument drives `AudienceStrip`'s
 * active state, and omitting it means the switch does not render. `/training` is
 * not one of the three audience pages.
 *
 * ⚠⚠ **`learn/layout.tsx` STILL BRANCHES ON THE VIEWER AND MUST.** It serves four
 * PUBLIC sub-routes — `/learn/courses`, `/learn/paths`, `/learn/[slug]` and
 * `/learn/[slug]/course/[courseSlug]` — so an anonymous visitor still needs the
 * marketing shell there. ⚠⚠⚠ **THE PAGE STOPS BRANCHING; THE LAYOUT CANNOT.
 * Reading "/learn no longer branches" as "the layout is simplified" would gate
 * four public browse pages, which is a capability lost silently.**
 */
export const metadata: Metadata = {
  /* ⚠ MIRRORS THE NAV LABEL (`E222`). ⚠⚠ THE LABEL DID **NOT** MOVE — it is still
     `Learn`; only the URL did. Renaming it to `Training` added ~72px to a nav row
     budgeted to 0.1px and clipped the marketing header at 768 (measured). */
  title: "Training — Panameer",
  description:
    "Free Oracle Cloud courses: procurement, finance, supply chain and HR, taught by the people who implement them.",
};

export default function TrainingPage() {
  return (
    <MarketingShell>
      <LearnPublic />
    </MarketingShell>
  );
}
