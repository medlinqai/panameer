import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { notify } from "@/lib/notifications";

// HS: the Hire (sole-source) journey — job posted (step 4), Hire on a match (8–9b), Terms (10–11), Work Order (12–13).

/** HS-E001: the buyer hears once that their job is saved and matched. */
export async function jobPosted(viewer: Viewer, jobId: string, title: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return;
  await notify({ event: "work.job_posted", personId: me.id, entityType: "job", entityId: jobId, dedupeKey: `work.job_posted:${jobId}`, vars: { title: title.trim(), jobId } });
}
