import { notFound, redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// OJ-E003: the Sourcing Event lives on its Job now — old links open the Job's Responses tab.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await guardPage("canHireTalent");
  const { id } = await params;
  const ev = await prisma.sourcingEvent.findUnique({ where: { id }, select: { job_id: true } });
  if (!ev) notFound();
  redirect(`/work-requests/${ev.job_id}?tab=responses`);
}
