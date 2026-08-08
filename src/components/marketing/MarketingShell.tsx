import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AudienceToggle } from "@/components/marketing/AudienceToggle";
import type { Audience } from "@/lib/audience";

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
  audience,
  children,
}: {
  audience: Audience;
  children: ReactNode;
}) {
  return (
    <div className="marketing-surface min-h-screen bg-white font-body text-ink">
      <MarketingHeader />
      <AudienceToggle audience={audience} />
      {children}
      <MarketingFooter />
    </div>
  );
}
