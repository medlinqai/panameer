import { Suspense, type ReactNode } from "react";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkTabs } from "@/components/work/WorkTabs";
import { OPEN_INVITE } from "@/lib/work-home";

// WS-E002: the Work area — white page and its tab row.
export default async function WorkLayout({ children }: { children: ReactNode }) {
  const viewer = await getSessionViewer();
  const me = viewer ? await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } }) : null;
  const invitations = me ? await prisma.proposalRequest.count({ where: { provider_person_id: me.id, status: { in: OPEN_INVITE } } }) : 0;
  return (
    <div className="pm-white-page">
      <Suspense>
        <WorkTabs invitations={invitations} />
      </Suspense>
      {children}
    </div>
  );
}
