import { Suspense, type ReactNode } from "react";
import { getSessionViewer } from "@/lib/session";
import { WorkTabs } from "@/components/work/WorkTabs";
import { appCounts } from "@/lib/attention";

// MD-E001: My Catalog is the first tab of Sell — the same SELL row as Jobs for You / Requests / Interviews / Tests.
export default async function CatalogLayout({ children }: { children: ReactNode }) {
  const viewer = await getSessionViewer();
  const c = viewer ? (await appCounts(viewer, "provider")).request : null;
  return (
    <>
      <Suspense>
        <WorkTabs badges={{ overview: c?.total ?? 0, invitations: c?.requests ?? 0, interviews: c?.interviews ?? 0, tests: c?.tests ?? 0 }} />
      </Suspense>
      {children}
    </>
  );
}
