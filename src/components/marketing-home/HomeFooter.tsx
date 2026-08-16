import Link from "next/link";
import { BRAND_BADGE } from "@/lib/brand";
import {
  FOOTER_ASSESSMENT,
  FOOTER_GROUPS,
  FOOTER_LEGAL,
  type FooterEntry,
} from "@/components/marketing/brand";

/**
 * THE MARKETING HOME FOOTER.
 *
 * Was the last piece of StratERP-era template on the page: a StratERP tagline,
 * four columns naming products Panameer does not have, and fourteen links that
 * all pointed at the empty fragment — three of which were legal pages that had
 * existed on disk for weeks.
 *
 * ── THE RULE THIS FOOTER IS BUILT ON (Scott, 2026-08-14) ─────────────────────
 *
 * A LINK SHIPS ONLY WHEN ITS DESTINATION EXISTS. Not dimmed, not pointed
 * somewhere approximate, not stubbed — omitted. Every href below resolves to a
 * real page that an anonymous visitor can reach, and each was clicked in a
 * running server before this shipped.
 *
 * ⚠ USED ONLY BY `/`. Verified by grep: `app/page.tsx` is the sole importer, so
 * the blast radius is section 9 and nothing else.
 */

/**
 * ⚠ THREE NETWORKS ARE PENDING, NOT DELETED — and one of them is a finding.
 *
 * FACEBOOK and LINKEDIN: the accounts exist, Scott has not supplied the URLs.
 *
 * X (`https://x.com/onpanameer`): THE BRIEF SUPPLIES THIS AS A CONFIRMED URL
 * AND IT DOES NOT RESOLVE. Held out rather than shipped, because shipping a
 * dead social icon on the marketing home is the exact defect this brief exists
 * to fix — the governing rule is "a link ships only when its destination
 * exists", and that rule has to bind the brief's own links too.
 *
 * The probe discriminates, so this is not a bot-block false positive:
 *
 *     x.com/X                              200
 *     x.com/nasa                           200
 *     x.com/onpanameer                     404   <- the brief's URL
 *     x.com/thishandleshouldnotexist99387  403
 *
 * Restoring it is one row below, once Scott confirms the handle. YouTube was
 * probed the same way and returns 200, so it ships.
 *
 * This is an array so putting any of them back is a data edit — add a row, not
 * markup. The X mark below is kept ready for that:
 *
 *   { label: "Panameer on X", href: "https://x.com/<handle>", icon: (
 *       <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
 *         <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
 *       </svg>) },
 *
 * — the X MARK, not the legacy bird.
 */
const SOCIALS = [
  {
    label: "Panameer on YouTube",
    href: "https://youtube.com/c/panameer",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.507a3.02 3.02 0 0 0-2.122-2.136C19.505 3.867 12 3.867 12 3.867s-7.505 0-9.378.504A3.02 3.02 0 0 0 .5 6.507C0 8.39 0 12.32 0 12.32s0 3.93.5 5.813a3.02 3.02 0 0 0 2.122 2.136c1.873.504 9.378.504 9.378.504s7.505 0 9.378-.504a3.02 3.02 0 0 0 2.122-2.136c.5-1.883.5-5.813.5-5.813s0-3.93-.5-5.813ZM9.545 15.887V8.754l6.273 3.567z" />
      </svg>
    ),
  },
] as const;

/**
 * ⚠ THE LINK TABLE IS SHARED WITH `MarketingFooter` NOW (E118).
 *
 * This footer and that one held two separate tables, and they disagreed: "Find
 * Work" pointed at /work-marketplace here and /for-providers there, and the same
 * destinations had different names on each. Both now read `FOOTER_GROUPS` from
 * `components/marketing/brand.tsx`, beside `MARKETING_NAV`, so the header and
 * both footers share one vocabulary.
 *
 * ── WHY THIS SHELL SURVIVED RATHER THAN COLLAPSING INTO ONE COMPONENT ────────
 *
 * The treatments genuinely differ. This one is the ported `.pm-home` stylesheet
 * — `.foot`, `.fcol`, the socials block, `BRAND_BADGE`, a bottom legal strip;
 * the other is Tailwind on `bg-ink` with legal as a column. Collapsing them
 * meant restyling the home page, which this brief puts out of scope. The DATA is
 * what was drifting, so the data is what is shared.
 *
 * ── WHAT REPLACED THE "OMIT UNTIL IT EXISTS" RULE ────────────────────────────
 *
 * This footer used to carry two columns because Scott's own rule was to omit
 * anything unbuilt, and applying it removed five of his eleven links. He has now
 * asked for the opposite: the FULL listing, so he can see and manage what is
 * missing. The honesty requirement did not go away — it moved into the rendering.
 * An entry with no `href` is plain text with a TBD marker, never an anchor.
 */

/**
 * ⚠ NO `href` MEANS NO ANCHOR. Matches `MarketingFooter`'s row exactly in
 * behaviour, in this footer's own type scale.
 */
function FooterRow({ entry }: { entry: FooterEntry }) {
  if (!entry.href) {
    return (
      <span className="foot-tbd">
        {entry.label}
        <span className="foot-tbd-tag">TBD</span>
      </span>
    );
  }
  return <Link href={entry.href}>{entry.label}</Link>;
}

/* Six index groups, then Legal — which this shell renders as its bottom strip. */
const COLUMNS = FOOTER_GROUPS;

export function HomeFooter() {
  return (
    <>
      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- the ported
          stylesheet sizes this by class (.brand-logo/.foot-logo); next/image
          needs explicit dimensions and would fight the mockup's CSS for a
          30px-tall wordmark. Same call the rest of the marketing surface makes. */}
              <img className="brand-logo foot-logo" src="/brand/panameer-new-on-dark.png" alt="Panameer" />
              {/*
                THE CONSTANT, NOT A COPY. The badge has been re-cut three times
                (E050, E065, E075); a hardcoded string here is exactly how a
                fourth re-cut half-lands and the footer keeps saying the old one.
              */}
              <div className="foot-desc">{BRAND_BADGE}</div>
              <div className="socials">
                {SOCIALS.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="foot-groups">
              {COLUMNS.map((col) => (
              <div className="fcol" key={col.title}>
                <h5>{col.title}</h5>
                {col.entries.map((e) => (
                  <FooterRow key={e.label} entry={e} />
                ))}
                {/* The assessment hangs under Learn — the free front door. */}
                {col.title === "Learn" && <FooterRow entry={FOOTER_ASSESSMENT} />}
                </div>
              ))}
            </div>
          </div>

          <div className="foot-bot">
            <span>© 2026 Panameer Inc. All rights reserved.</span>
            <span className="lg">
              {FOOTER_LEGAL.map((l) => (
                <Link key={l.label} href={l.href!}>
                  {l.label}
                </Link>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
