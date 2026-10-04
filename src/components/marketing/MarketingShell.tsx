import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { AudienceStrip } from "@/components/marketing/AudienceStrip";
import type { PublicPage } from "@/lib/audience";

export function MarketingShell({
  page,
  children,
}: {
  page?: PublicPage;
  children: ReactNode;
}) {
  return (
    <div className="marketing-surface min-h-screen bg-white font-body text-ink">
      {}
      <div className="sticky top-0 z-50">
        {}
        {page && <AudienceStrip page={page} />}
        <MarketingHeader />
      </div>
      {children}
      <MarketingFooter />
    </div>
  );
}
