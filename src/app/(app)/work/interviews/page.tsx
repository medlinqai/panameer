import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { JobsInterviews, JobsTests } from "@/components/work/JobsAppViews";
import { AppCrumb, AlsoIn, StageChips } from "@/components/home/AppNav";

export const metadata = { title: "Interviews & Tests · Work · Panameer" };

// WK-E003: Work › Interviews & Tests — one page, two stages (were two Sell tabs).
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string; view?: string; show?: string; date?: string; slice?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const sp = await searchParams;
  const tests = sp.stage === "tests";
  const [ivs, tst] = await Promise.all([
    prisma.interviewRequest.count({ where: { provider_person_id: me.id, status: { in: ["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"] } } }),
    prisma.testRequest.count({ where: { provider_person_id: me.id, status: { in: ["ISSUED", "IN_PROGRESS"] } } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" data-work-interviews>
      <AppCrumb app="Work" href="/work/home" page="Interviews & Tests" />
      <StageChips base="/work/interviews" current={tests ? "tests" : "all"} stages={[["all", "Interviews", ivs], ["tests", "Tests", tst]]} />
      {tests ? <JobsTests personId={me.id} slice={sp.slice} /> : <JobsInterviews personId={me.id} userId={viewer.userId} view={sp.view ?? null} show={sp.show ?? null} date={sp.date ?? null} />}
      <AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Estimates", "/work/estimates"], ["My Catalog", "/catalog"]]} />
    </div>
  );
}
