import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";

/** DB-E009/E010: the interview as one of its two parties sees it (null for anyone else). */
export async function interviewForParty(viewer: Viewer, interviewId: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return null;
  const iv = await prisma.interviewRequest.findUnique({ where: { id: interviewId }, select: { id: true, request_number: true, status: true, duration_minutes: true, room_name: true, room_url: true, confirmed_line_id: true, provider_person_id: true, requested_by_person_id: true, job_id: true } });
  if (!iv || (iv.provider_person_id !== me.id && iv.requested_by_person_id !== me.id)) return null;
  const line = iv.confirmed_line_id ? await prisma.interviewResponseLine.findUnique({ where: { id: iv.confirmed_line_id }, select: { starts_at: true } }) : null;
  const job = await prisma.job.findUnique({ where: { id: iv.job_id }, select: { title: true } });
  return { ...iv, side: iv.provider_person_id === me.id ? ("provider" as const) : ("buyer" as const), startsAt: line?.starts_at ?? null, jobTitle: job?.title ?? "" };
}
