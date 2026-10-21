import { Suspense, type ReactNode } from "react";
import { getSessionViewer } from "@/lib/session";
import { WorkTabs } from "@/components/work/WorkTabs";
import { appCounts } from "@/lib/attention";

// WS-E002: the Work area — white page and its tab row.
export default async function WorkLayout({ children }: { children: ReactNode }) {
  const viewer = await getSessionViewer();
  const c = viewer ? (await appCounts(viewer, "provider")).request : null;
  return (
    <div className="pm-white-page">
      <Suspense>
        <WorkTabs badges={{ overview: c?.total ?? 0, invitations: c?.requests ?? 0, interviews: c?.interviews ?? 0, tests: c?.tests ?? 0 }} />
      </Suspense>
      {children}
    </div>
  );
}
