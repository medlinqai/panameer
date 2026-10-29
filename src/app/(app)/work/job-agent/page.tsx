import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { agentSources, markSeen, todaysFinds } from "@/lib/job-agent";
import { sourceLabel } from "@/lib/external-jobs";
import { AppCrumb, AlsoIn } from "@/components/home/AppNav";
import { ExternalRowAction } from "@/components/work/ExternalRowAction";
import { WantForm } from "@/components/work/WantForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Job Agent · Work · Panameer" };

// EX-E004: Work › Job Agent — Today's Finds, What I Want, the Daily Digest, and the sites jobs came from.
export default async function Page() {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const [{ finds, want }, sources] = await Promise.all([todaysFinds(me.id), agentSources()]);
  await markSeen(me.id);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-job-agent>
      <AppCrumb app="Work" href="/work/home" page="Job Agent" />
      <h1 className="text-[28px] font-extrabold">Panameer Job Agent</h1>
      <p className="text-[14px] text-ink-2">Stop going to all these sites. Let the jobs find you.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
        <aside className="space-y-6">
          <section className="rounded-[12px] border border-state-border p-4"><h2 className="mb-2 text-[16px] font-extrabold">What I Want</h2><WantForm want={want} /></section>
          <section className="rounded-[12px] border border-state-border p-4"><h2 className="text-[16px] font-extrabold">Sources</h2>
            <ul className="mt-2 text-[13.5px]">{sources.map((s) => <li key={s.source} className="flex justify-between border-t border-line py-1.5"><span>{s.source}</span><b className="tabular-nums">{s.n}</b></li>)}{!sources.length && <li className="text-ink-3">No sources yet.</li>}</ul>
          </section>
        </aside>
      </div>
      <AlsoIn app="Work" links={[["Jobs for You", "/work/jobs"], ["Estimates", "/work/estimates"], ["Product Orders", "/work/product-orders"]]} />
    </div>
  );
}
