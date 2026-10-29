import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { agentSources, markSeen, todaysFinds, wantFor } from "@/lib/job-agent";
import { fromWant, hasFilters, parseFilters, toParams, type FilterParams } from "@/lib/job-filters";
import { JobFilterBar } from "@/components/work/JobFilterBar";
import { sourceLabel } from "@/lib/external-jobs";
import { AppCrumb, AlsoIn } from "@/components/home/AppNav";
import { ExternalRowAction } from "@/components/work/ExternalRowAction";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job Agent · Work · Panameer" };

// EX-E004 / XA-E005: Work › Job Agent — the filter bar (saved as the Job Agent's criteria), Today's Finds and a Sources count.
export default async function Page({ searchParams }: { searchParams: Promise<FilterParams> }) {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const sp = await searchParams;
  const { want } = await wantFor(me.id);
  const filters = hasFilters(sp) ? parseFilters(sp) : fromWant(want);
  const [{ finds }, sources] = await Promise.all([todaysFinds(me.id, filters), agentSources()]);
  await markSeen(me.id);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-job-agent>
      <AppCrumb app="Work" href="/work/home" page="Job Agent" />
      <h1 className="text-[28px] font-extrabold">Panameer Job Agent</h1>
      <p className="text-[14px] text-ink-2">Stop going to all these sites. Let the jobs find you.</p>
      <JobFilterBar action="/work/job-agent" values={toParams(filters)} sources={sources.map((x) => x.source)} digest={want.digest} />
      <p className="mt-2 text-[12.5px] text-ink-3" data-sources>Sources: {sources.length ? sources.map((x) => `${x.source} ${x.n}`).join(" · ") : "none yet"}</p>
      <div className="mt-5">
        <section>
          <h2 className="text-[18px] font-extrabold">Today&apos;s Finds <span className="text-[13px] font-semibold text-ink-3">{finds.length}</span></h2>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {finds.slice(0, 50).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3" data-agent-find>
                <span className="min-w-0 flex-1">
                  <Link href={`/work/external/${e.id}`} className="block truncate text-[15px] font-bold hover:underline">{e.title}</Link>
                  <span className="text-[12.5px] text-ink-2"><b className="font-semibold text-state-inactive">{sourceLabel(e.source)}</b> · {[e.company, e.workType ?? e.location, e.salary].filter(Boolean).join(" · ")}{e.matched ? ` · matches ${e.matched} of your skills` : ""}</span>
                </span>
                <ExternalRowAction e={e} admin={viewer.isSystemAdmin} />
              </li>
            ))}
            {!finds.length && <li className="py-6 text-[14px] text-ink-3">Nothing new since your last visit.</li>}
          </ul>
        </section>
      </div>
      <AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Estimates", "/work/estimates"], ["Product Orders", "/work/product-orders"]]} />
    </div>
  );
}
