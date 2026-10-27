import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import type { ReactNode } from "react";
import { PendingJoinBanner } from "@/components/casing/PendingJoinBanner";
import { HiddenProfileBanner } from "@/components/casing/HiddenProfileBanner";
import { AppBand } from "@/components/casing/AppBand";
import { PunchinBar } from "@/components/casing/PunchinBar";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { themeVars } from "@/lib/dynamic-branding";
import { yourThemeVars } from "@/lib/company-theme";
import { LifecycleHelpHost } from "@/components/lifecycle/LifecycleHelp";
import { TaskPanel } from "@/components/console/TaskPanel";
import { UsageBeacon } from "@/components/casing/UsageBeacon";

export async function AppShell({ children, locked = false }: { children: ReactNode; locked?: boolean }) {

  const viewer = await getSessionViewer();
  // Dynamic Branding: only approved members of the company get its theme; everyone else sees Panameer's.
  const company = viewer
    ? (
        await prisma.companyMembership.findFirst({
          where: { person: { user_id: viewer.userId }, status: "APPROVED" },
          orderBy: { created_at: "asc" },
          select: { company: { select: { brand_hue: true, theme_recipe: true, theme_enabled: true, theme_header_hex: true, theme_accent_hex: true, theme_background_hex: true, theme_logo_url: true, theme_background_url: true, theme_approved_at: true } } },
        })
      )?.company ?? null
    : null;
  // Admins get the Task Panel on the right on every page, not just /admin (2026-10-10).
  const isAdmin = viewer?.isSystemAdmin === true;
  // WA-E005: an approved Your Theme (header · accent · background · logo) wins; otherwise Dynamic Branding; otherwise Panameer's.
  const yours = yourThemeVars(company);
  const theme = yours ?? themeVars(company?.brand_hue, company?.theme_recipe, company?.theme_enabled ?? null);
  const bgImage = yours && company?.theme_background_url ? { backgroundImage: `url("${company.theme_background_url}")`, backgroundSize: "cover", backgroundAttachment: "fixed" } : {};

  return (
    <div
      style={{ ...(theme?.vars ?? {}), ...bgImage } as React.CSSProperties}
      data-brand-theme={theme ? (theme.light ? "light" : "dark") : undefined}
      className="flex min-h-screen flex-col bg-canvas font-body text-ink"
    >
      <LifecycleHelpHost />
      {viewer && <UsageBeacon />}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppBand locked={locked} brandLogo={yours ? company?.theme_logo_url ?? null : null} />
        {!locked && <PunchinBar />}

        {}
        {!locked && <HiddenProfileBanner />}
        {!locked && <PendingJoinBanner />}

        {}
        <main className={locked ? "pm-in-casing flex flex-1 flex-col" : "flex-1 overflow-x-clip px-5 py-6 sm:px-8" + (isAdmin ? " lg:pr-[84px]" : "")}>{children}</main>

        {}
        <MarketingFooter />
      </div>
      {isAdmin && <TaskPanel />}
    </div>
  );
}
