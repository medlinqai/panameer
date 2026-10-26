import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MeProvider } from "@/components/MeProvider";
import { AppShell } from "@/components/casing/AppShell";
import { getSessionViewer } from "@/lib/session";
import { AppFrame } from "@/components/home/AppFrame";

// WK-E005: Learn has no tab row — the home's tiles and What You Can Do open these; each page says ← Learn and Also in Learn.
const PAGES: [string, string][] = [["My Learning", "/learn/my"], ["All Learning Paths", "/learn/paths"], ["Certificates", "/learn/certificates"], ["Courses", "/learn/courses"], ["Teaching", "/learn/teaching"]];

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
        <AppShell><div className="pm-white-page"><AppFrame app="Learn" home="/learn" base="/learn" pages={PAGES}>{children}</AppFrame></div></AppShell>
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
