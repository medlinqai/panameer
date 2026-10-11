import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { getSessionViewer } from "@/lib/session";

export default async function LearnLayout({
  children,
}: {
  children: ReactNode;
}) {
  const viewer = await getSessionViewer();

  if (viewer) {
    return (
      <MeProvider>
        {/* WS-E001: white page, like Connect and Profile. */}
        <AppShell><div className="pm-white-page">{children}</div></AppShell>
      </MeProvider>
    );
  }

  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      {}
      {}
      <MarketingFooter />
    </div>
  );
}
