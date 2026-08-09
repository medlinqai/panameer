import Link from "next/link";
import { AUDIENCE_TOGGLE } from "@/lib/brand";
import { AUDIENCE_PATH, type Audience } from "@/lib/audience";

/**
 * "I'm here to:" — the audience switch, back in the top zone (WS-2a).
 *
 * ── WHY IT MOVED OUT OF THE HERO ─────────────────────────────────────────────
 *
 * The rebuild put this control inside the hero, directly above the search box,
 * where it did two unrelated jobs at once: it switched the whole page, and it
 * looked exactly like a filter on the search beneath it. A pill pair sitting on
 * top of a search field reads as "search within this" — so the one control that
 * navigates away was dressed as the one control that narrows. Splitting them is
 * the fix: the page switch lives up here in the notice zone, and the search is
 * left to be a search.
 *
 * ⚠ THIS REINSTATES THE STRIP I REMOVED IN THE REBUILD, deliberately and with
 * the reasoning reversed. I took it out because two toggles carrying different
 * words for the same choice is worse than one. Correct — but I kept the wrong
 * one. The hero pill was the ambiguous one; the strip was never confusing about
 * what it did. Same conclusion, opposite survivor.
 *
 * ── PROPERTIES ───────────────────────────────────────────────────────────────
 *
 * PERMANENT. No dismiss, no cookie, no client state — the strip only exists to
 * get a side picked, and the previous version's Dismiss was a control whose
 * only function was to close that question unanswered.
 *
 * TWO <Link>s, NEVER STATE. The audience is the route: which side is active is
 * a fact about the URL, so it comes from the `audience` prop the page already
 * knows. That keeps this a server component (both routes stay static), makes
 * both destinations indexable and prefetched, and leaves middle-click working.
 *
 * DEV-BANNER STYLING, on purpose. It sits in the same top zone as the "in
 * active development" banner, and matching its tint, border and weight makes
 * the two read as one stack of page-level notices rather than two systems.
 */
export function AudienceStrip({ audience }: { audience: Audience }) {
  return (
    <div className="border-b border-magenta/20 bg-magenta/8 px-4 py-2.5 text-ink sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-[14px] font-bold">I&apos;m here to:</span>

        <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-line bg-white p-1">
          {(["buyer", "provider"] as const).map((side) => {
            const on = side === audience;
            return (
              <Link
                key={side}
                href={AUDIENCE_PATH[side]}
                aria-current={on ? "page" : undefined}
                className={
                  "rounded-full px-4 py-1.5 text-center text-[13.5px] font-bold transition-colors " +
                  (on
                    ? "bg-magenta text-white"
                    : "text-ink-2 hover:text-magenta")
                }
              >
                {AUDIENCE_TOGGLE[side]}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
