import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { HiddenProfileBanner } from "@/components/casing/HiddenProfileBanner";
import { AppBand } from "@/components/casing/AppBand";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveTheme } from "@/lib/themeRecipes";

export async function AppShell({ children }: { children: ReactNode }) {

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
    <div
      style={themeVars}
      className="flex min-h-screen flex-col bg-canvas font-body text-ink"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <AppBand />

        {}
        <HiddenProfileBanner />

        {}
        <main className="flex-1 overflow-x-clip px-5 py-6 sm:px-8">{children}</main>

        {}
        <MarketingFooter />
      </div>
    </div>
  );
}
