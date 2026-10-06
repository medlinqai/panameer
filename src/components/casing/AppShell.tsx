import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { HiddenProfileBanner } from "@/components/casing/HiddenProfileBanner";
import { AppBand } from "@/components/casing/AppBand";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { themeVars } from "@/lib/dynamic-branding";
import { LifecycleHelpHost } from "@/components/lifecycle/LifecycleHelp";

export async function AppShell({ children }: { children: ReactNode }) {

  const viewer = await getSessionViewer();
  // Dynamic Branding: only approved members of the company get its theme; everyone else sees Panameer's.
  const company = viewer
    ? (
        await prisma.companyMembership.findFirst({
          where: { person: { user_id: viewer.userId }, status: "APPROVED" },
          orderBy: { created_at: "asc" },
          select: { company: { select: { brand_hue: true, theme_recipe: true, theme_enabled: true } } },
        })
      )?.company ?? null
    : null;
  const theme = themeVars(company?.brand_hue, company?.theme_recipe, company?.theme_enabled ?? null);

  return (
    <div
      style={theme?.vars as React.CSSProperties | undefined}
      data-brand-theme={theme ? (theme.light ? "light" : "dark") : undefined}
      className="flex min-h-screen flex-col bg-canvas font-body text-ink"
    >
      <LifecycleHelpHost />
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
