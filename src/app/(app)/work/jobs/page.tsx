import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { JOB_STAGES, jobsHref, workJobRows } from "@/lib/work-app";
import { AppCrumb, AlsoIn, StageChips } from "@/components/home/AppNav";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

export const metadata = { title: "Jobs for You · Work · Panameer" };

const PILL: Record<string, string> = { ok: "bg-state-accepted-bg text-state-accepted", pend: "bg-state-pending-bg text-state-pending", no: "bg-state-declined-bg text-state-declined", st: "bg-state-inactive-bg text-state-inactive" };
const ACTION: Record<string, string> = { "You Matched": "Apply", "They Requested": "Respond" };

// WK-E003: Jobs for You — every job you've touched, by stage (Requests are a stage here, not a tab).
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const { stage: raw } = await searchParams;
  const rows = (await workJobRows(me.id, viewer)).filter((r) => r.donut === "jobs");
  const stage = JOB_STAGES.find((s) => s === raw) ?? "all";
  const list = stage === "all" ? rows : rows.filter((r) => r.slice === stage);
  const open = await prisma.job.count({ where: { kind: "JOB", status: "OPEN" } });
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-work-jobs>
      <AppCrumb app="Work" href="/work/home" page="Jobs for You" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold">Jobs for You</h1>
          <p className="text-[14px] text-ink-2">Jobs that match your skills, and every job you&apos;ve touched. {open.toLocaleString("en-US")} open jobs on Panameer.</p>
        </div>
        <Link href="/find-work?tab=best" className={BTN}>Browse the Job Board</Link>
      </div>
      <div className="mt-4"><StageChips base={jobsHref()} current={stage} stages={[["all", "All", rows.length], ...JOB_STAGES.map((s) => [s, s, rows.filter((r) => r.slice === s).length] as [string, string, number])]} /></div>
      <ul className="divide-y divide-line border-y border-line">
        {list.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-3 py-3" data-work-job={r.slice}>
            <span className="min-w-0 flex-1"><Link href={r.href} className="block truncate text-[15px] font-bold hover:underline">{r.what}</Link><span className="text-[12.5px] text-ink-2">{r.who}</span></span>
            <span className="text-[13px] tabular-nums">{r.amount}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${PILL[r.tone]}`}>{r.status}</span>
            <span className="w-full text-[12.5px] text-ink-2 sm:w-auto">{r.waitingOnYou ? `Your Next Step: ${r.next}` : r.waitingOn !== "—" ? `Waiting on ${r.waitingOn}` : ""}</span>
            <Link href={r.href} className={ACTION[r.slice] ? BTN : BTN_OUT}>{ACTION[r.slice] ?? "View"}</Link>
          </li>
        ))}
        {!list.length && <li className="py-6 text-[14px] text-ink-3">Nothing at this stage.</li>}
      </ul>
      <AlsoIn app="Work" links={[["Estimates", "/work/estimates"], ["Interviews & Tests", "/work/interviews"], ["My Catalog", "/catalog"]]} />
    </div>
  );
}
