import Link from "next/link";
import { PUBLIC_PAGES, type PublicPage } from "@/lib/audience";

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
export function AudienceStrip({ page }: { page: PublicPage }) {
  return (
    /*
      GLASS, NOT A SOLID BAND (WS-1). The strip is pinned — MarketingShell
      wraps it and the header in one sticky container — so the whole page
      scrolls beneath it. An opaque fill would make that a hard edge sliding
      over the content; an 8% magenta wash with a 10px backdrop blur lets the
      content ghost through instead, which is the treatment the header already
      uses and what makes the two read as one pinned unit.

      `backdrop-saturate-150` alongside the blur for the same reason the header
      has it: blurring alone desaturates what shows through, and the brand is
      mostly magenta.
    */
    <div className="border-b border-magenta/20 bg-magenta/8 px-4 py-2.5 text-ink backdrop-blur-[10px] backdrop-saturate-150 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {/*
          NO "I'm here to:" LEAD (WS-1). Two options that say "I Hire…" and
          "I Sell…" already start with the pronoun; the label was reading the
          first two words of both buttons back to the visitor before they got
          to them.
        */}
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-line bg-white/70 p-1">
          {/*
            THREE OPTIONS NOW (brief_public_pages_ia WS-4), labelled by the
            visitor's JOB rather than by what we call them. "I want to hire"
            beats "I Hire Experts & Buy Services" for the same reason the rest
            of this rebuild is in second person: the reader is picking what they
            came to do, not identifying with a segment name.
          */}
          {PUBLIC_PAGES.map((p) => {
            const on = p.key === page;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-current={on ? "page" : undefined}
                className={
                  "rounded-full px-4 py-1.5 text-center text-[13.5px] font-bold transition-colors " +
                  (on
                    ? "bg-magenta text-white"
                    : "text-ink-2 hover:text-magenta")
                }
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
