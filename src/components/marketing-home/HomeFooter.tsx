/*
  ⚠⚠ THIS COMPONENT'S STYLESHEET, IMPORTED BY THE COMPONENT (`P1-ALL-E013`).

  It used to rely on whichever page rendered it having imported `home.css` and
  having wrapped it in `.pm-home`. `/` and `/optimize` both do. `app/learn/layout.tsx`
  did NEITHER, and shipped a broken footer for as long as it has existed.

  ⚠ CSS IMPORTS DEDUPE, so `/` and `/optimize` importing it too costs nothing —
  proven by measurement, not assumed: both pages' footers are byte-identical
  before and after this change at 1440 and 390.
*/
import "@/components/marketing-home/home.css";
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
    /*
      ⚠⚠ THE `.pm-home` WRAPPER IS PART OF THE COMPONENT NOW, AND IT IS THE FIX FOR
      `P1-ALL-E013`.

      Scott, 2026-08-24, screenshotting the bottom of `/learn`: *"what is this?
      Guessing it is the footer and it is all goofed up?"* The YouTube mark rendered
      1440x1440, filling the viewport and crushing every footer column into an
      unreadable stack.

      ── THE CAUSE, MEASURED RATHER THAN GUESSED ───────────────────────────────

      ⚠ IT WAS NEVER ABOUT THE ICON. EVERY rule this markup needs is
      `.pm-home`-scoped — `home.css:617` (`footer`), `:632` (`.foot`'s grid),
      `:643-646` (`.socials`) — and `app/learn/layout.tsx` rendered it outside that
      scope AND without importing the stylesheet at all. `/` and `/optimize` do both
      at page level, which is why they were always fine and only `/learn` broke.

      Measured on `/learn` before the fix: `.foot` `grid-template-columns: none`
      instead of `1.4fr 3fr`; `.socials` `display:block` at 1440 wide instead of
      `flex`; `.socials a` `display:inline` with no background instead of a 36x36
      chip; footer background transparent instead of `--ink`. The icon was simply
      the loudest symptom — the `<svg>` carries a `viewBox` and no intrinsic size, so
      with `.pm-home .socials a svg{width:16px;height:16px}` not matching, it
      expanded to fill its parent.

      ⚠ SO THE FIX IS SCOPE AND OWNERSHIP, NOT A WIDTH ATTRIBUTE. Sizing the `<svg>`
      would have hidden one symptom and left the grid, the chips and the background
      still wrong — a fix that makes a bug harder to see is worse than the bug.

      ⚠ AND THE STANDING OBJECTION TO `.pm-home` DOES NOT APPLY. The usual argument
      is that the wrapper drags the mockup's `*{margin:0;padding:0}` reset onto a
      Tailwind page — but `home.css:64-77` records that THE RESET WAS DELIBERATELY
      NEVER PORTED. All `.pm-home` carries is the variable block, `box-sizing`, a
      font stack, a colour, and a `background:#fff` the dark `footer` paints over.

      ⚠ NESTING IS HARMLESS AND IS WHAT HAPPENS ON `/` AND `/optimize` — this
      `.pm-home` sits inside theirs. Descendant selectors still match and the
      variables re-declare to identical values. Byte-identity at 1440 and 390 was
      measured before and after; nothing on those two pages moved.

      ⚠ THE DEFECT CLASS WAS A COMPONENT DEPENDING ON ITS CALLER'S STYLESHEET. Three
      callers, two of which happened to be right. Owning both here is what stops a
      fourth caller getting it wrong. `check:ui` also asserts geometrically that
      nothing inside the footer exceeds a sane box, so a future unsized asset fails
      the same way.

      ⚠ PRE-EXISTING, NOT INTRODUCED BY THE 2026-08-24 WORK. This has been broken
      since `E223` replaced `/learn`'s one-line strip with the real footer.
    */
    <div className="pm-home">
      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- the ported
          stylesheet sizes this by class (.brand-logo/.foot-logo); next/image
          needs explicit dimensions and would fight the mockup's CSS for a
          30px-tall wordmark. Same call the rest of the marketing surface makes. */}
              <img
                className="brand-logo foot-logo"
                src="/brand/panameer-new-on-dark.png"
                alt="Panameer"
              />
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
                  {col.title === "Learn" && (
                    <FooterRow entry={FOOTER_ASSESSMENT} />
                  )}
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
    </div>
  );
}
