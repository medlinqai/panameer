import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { AppRail } from "@/components/casing/AppRail";
import { AppHeader } from "@/components/casing/AppHeader";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveTheme } from "@/lib/themeRecipes";

/**
 * THE CASING — dark rail + header + footer, every authenticated page
 * (MASTER WS9, ref E151-provider-home-casing.png and Medlinq's Sidebar).
 *
 * Replaces the light SideRail. The structure is Medlinq's, rebranded onto
 * Panameer tokens rather than copied with its teal: the rail is #140c29 and the
 * active pill #d127d0, both sampled out of the mockup PNG, and the canvas is
 * #f7f7f5 rather than white so the white cards on it have an edge.
 *
 * The footer is one line of copyright and it is part of the SHELL, not of any
 * page — it was the only element in the mockup with nowhere else to live.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  /* ⚠ `const year` WENT WITH THE ONE-LINE BAND (`E246` §7). `MarketingFooter`
     carries its own copyright in its legal bar; an unused local would be a new lint
     warning against a 0-new baseline. The quoted band below is a comment, not code. */

  /*
    THE TENANT THEME, APPLIED AS CSS VARIABLES (E204 WS-C).

    Resolved once at the shell and written as inline custom properties, which is
    what lets every surface below inherit it without a single component knowing
    a company theme exists — `bg-rail` and `bg-canvas` already read these vars.

    AN UNTHEMED COMPANY IS BIT-FOR-BIT UNCHANGED. `resolveTheme(null, null)`
    returns the Panameer default, and the override is only emitted when the
    company actually chose something — so no existing tenant's console shifts by
    a pixel because this feature shipped.
  */
  const viewer = await getSessionViewer();
  const company = viewer
    ? await prisma.company.findFirst({
        where: { people: { some: { user_id: viewer.userId } } },
        select: { brand_hue: true, theme_recipe: true },
      })
    : null;
  const themed = Boolean(company?.brand_hue || company?.theme_recipe);
  const t = resolveTheme(company?.brand_hue, company?.theme_recipe);
  const themeVars = themed
    ? ({
        "--color-rail": t.surfaceDark,
        "--color-canvas": t.surfaceLight,
        "--color-rail-active": t.brandPrimary,
        "--color-magenta": t.brandPrimary,
      } as React.CSSProperties)
    : undefined;

  return (
    /*
      COLUMN below lg, ROW at lg and up.

      AppRail renders two things: the desktop aside (hidden below lg) and the
      mobile top bar (hidden at lg and up). As a plain flex row, that mobile bar
      was a SIBLING FLEX ITEM at 375px and took 224px of the viewport, leaving
      main 151px wide — which is why the profile and Work pages scrolled
      sideways while the pages whose content could shrink merely looked cramped.
      Stacking below lg puts the bar above the content where it belongs.
    */
    <div
      style={themeVars}
      className="flex min-h-screen flex-col bg-canvas font-body text-ink lg:flex-row"
    >
      <AppRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>

        {/*
          ── ⚠⚠ THE SHELL'S FOOTER IS THE REAL ONE NOW (`P1-J1.1-E246` §7) ────────

          Scott, 2026-08-29: **"the footer must be in."** With **"If logged in, the
          app shell is there (meaning on the left). If not, there is a top menu and
          no left side menu."** So: two chromes, ONE footer. This shell keeps OWNING
          the footer — which its own header already called the right instinct, "part
          of the SHELL, not of any page" — and what it owns becomes the real one.

          ⚠ SUPERSEDED, quoted not deleted — this was a one-line band:
              <footer className="border-t border-line px-5 py-4 text-[13px] text-ink-2 sm:px-8">
                Copyright – Panameer Inc {year}
              </footer>
          ⚠⚠ IT WAS REPLACED, NOT STACKED ABOVE THE NEW ONE. `MarketingFooter`
          already ends in a full-width legal bar carrying the copyright, and two
          copyright lines on one page is the defect rather than the fix.
          ⚠ THAT REPLACEMENT IS CHAT'S CALL, NOT SCOTT'S — reported at `E246` so he
          can overrule it on the walk.

          ⚠⚠ BLAST RADIUS: this shell wraps EVERY AUTHENTICATED PAGE — /dashboard,
          /company, /settings/*, /contracts, /pay, /community, /notifications,
          /search, the admin pages and /learn signed-in. All of them gain the
          three-column video footer. That is what "the footer must be in" means and
          it is intended, but it is the widest change in `E246`.
          ⚠ `/learn`'s LAYOUT NEEDED NO EDIT. Its signed-in branch already renders
          this shell, so the footer arrives through here — that fork was copied, not
          reinvented.
          ⚠ MEASURED INSIDE THE SHELL for `E246` — colour, height and the rail/footer
          corner — because one component rendering in two colours and two heights is
          exactly what `P1-ALL-E020` was about. Numbers are in that report.
        */}
        <MarketingFooter />
      </div>
    </div>
  );
}
