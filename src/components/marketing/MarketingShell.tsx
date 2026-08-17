import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AudienceStrip } from "@/components/marketing/AudienceStrip";
import type { PublicPage } from "@/lib/audience";

/**
 * The chrome every marketing page shares (E051).
 *
 * Extracted when `/` stopped being the only one. Three pages each repeating the
 * `marketing-surface` wrapper, the header, the toggle and the footer is three
 * places for one of them to drift — and `marketing-surface` in particular is
 * not decoration: it pins the light palette so the dark theme cannot turn this
 * page's ink near-white while its white panels stay white (the E003/E009 bug).
 * A page that forgets it looks broken only in dark mode, which is exactly the
 * kind of thing nobody catches.
 *
 * NOT A ROUTE-GROUP LAYOUT, deliberately. `app/(marketing)/layout.tsx` would
 * give the same chrome for free, but it cannot see which page is rendering, and
 * the toggle needs to know which side is active. Passing `audience` explicitly
 * from each page is one line per page and keeps the fork legible at the top of
 * every file.
 */
export function MarketingShell({
  page,
  children,
}: {
  /**
   * WHICH OF THE THREE PUBLIC PAGES this is — drives the switch's active state
   * (brief_public_pages_ia WS-4).
   *
   * Was `audience`, which stopped being enough the moment there were two
   * buyer-voiced pages: the home and Hire Talent both speak to a buyer and are
   * different destinations, so "which audience" could no longer answer "which
   * one is highlighted".
   *
   * ── OPTIONAL SINCE brief_public_ia_block2 WS-1 ──────────────────────────────
   *
   * OMIT IT AND THE SWITCH DOES NOT RENDER. `AudienceStrip` maps over every
   * entry of `PUBLIC_PAGES`, so the only way to give a fourth page this chrome
   * without putting a fourth item into a three-way intent switch — on Home,
   * Hire Talent and Find Work, all three already walked and signed off — is to
   * let a page opt out of the strip entirely.
   *
   * ⚠ THE ALTERNATIVE IS THE TRAP: adding `enterprise`/`why` to `PublicPage`
   * would silently grow the switch on those three pages. `PublicPage` and
   * `PUBLIC_PAGES` are deliberately UNCHANGED.
   *
   * `marketing-surface` is NOT optional and is applied either way — it pins the
   * light palette so the dark theme cannot turn a page's ink near-white while
   * its white panels stay white (E003/E009).
   */
  page?: PublicPage;
  children: ReactNode;
}) {
  return (
    <div className="marketing-surface min-h-screen bg-white font-body text-ink">
      {/*
        ONE STICKY UNIT (WS-1). The strip and the header pin together rather
        than each carrying its own `top` offset. The alternative — strip at
        top-0, header at top-[whatever the strip measures] — hard-codes one
        element's height into another element's CSS, and the first copy change
        that reflows the strip on a phone breaks it silently.

        The header keeps its own `sticky top-0` for the pages that render it
        WITHOUT the strip (/learn, /verify, /explore). Nested inside this
        wrapper it simply travels with the parent.
      */}
      <div className="sticky top-0 z-50">
        {/*
          NO STRIP WHEN THERE IS NO `page`. The header keeps its own
          `sticky top-0` for exactly this case, so a shell without the strip
          still pins correctly rather than depending on the strip's height.
        */}
        {page && <AudienceStrip page={page} />}
        <MarketingHeader />
      </div>
      {children}
      <MarketingFooter />
    </div>
  );
}
