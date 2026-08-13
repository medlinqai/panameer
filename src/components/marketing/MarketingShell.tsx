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
   */
  page: PublicPage;
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
        <AudienceStrip page={page} />
        <MarketingHeader />
      </div>
      {children}
      <MarketingFooter />
    </div>
  );
}
