import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { JOB_STAGES, jobsHref } from "@/lib/work-app";
import { sellerDashboard } from "@/lib/dashboard/seller";
import { todoGroups } from "@/lib/todo";
import { StageBand } from "@/components/home/StageBand";
import { ExternalRowAction } from "@/components/work/ExternalRowAction";
import { JobFilterBar } from "@/components/work/JobFilterBar";
import { applyFilters, hasFilters, parseFilters, toParams, type FilterParams } from "@/lib/job-filters";
import { wantFor } from "@/lib/job-agent";
import { EXT_PIE, EXT_STAGE_LABEL } from "@/lib/external-apply";
import { externalForPerson, sourceLabel } from "@/lib/external-jobs";

const KINDS: [string, string][] = [["all", "All"], ["posted", "Posted on Panameer"], ["external", "External"], ["matched", "You Matched"], ["applied", "Applied"]];

const STEP_GROUPS: Record<string, string[]> = { "You Matched": ["Jobs for You"], "They Requested": ["Availability Requests", "Questions to Answer"], "You Interviewed": ["Interview Times to Pick", "Tests to Take"] };
import { AppCrumb, AlsoIn } from "@/components/home/AppNav";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

export const metadata = { title: "Jobs for You · Work · Panameer" };

const PILL: Record<string, string> = { ok: "bg-state-accepted-bg text-state-accepted", pend: "bg-state-pending-bg text-state-pending", no: "bg-state-declined-bg text-state-declined", st: "bg-state-inactive-bg text-state-inactive" };
const ACTION: Record<string, string> = { "You Matched": "Apply", "They Requested": "Respond" };

// WK-E003: Jobs for You — every job you've touched, by stage (Requests are a stage here, not a tab).
export default async function Page({ searchParams }: { searchParams: Promise<{ stage?: string; kind?: string; ext?: string } & FilterParams> }) {
  const viewer = await guardPage("canProvideServices");
  const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/dashboard");
  const sp = await searchParams;
  const { stage: raw, kind: rawKind, ext: rawExt } = sp;
  const [all, actions, externalAll, { want }] = await Promise.all([sellerDashboard(me.id, viewer).then((d) => d.rows), todoGroups(me.id, "provider"), externalForPerson(me.id), wantFor(me.id)]);
  // XA-E005: the same filter bar as the Job Agent; Search also narrows Panameer jobs.
  const filters = parseFilters(sp);
  const external = hasFilters(sp) ? applyFilters(externalAll, filters) : externalAll;
  const sources = [...new Set(externalAll.map((e) => e.source))];
  // EX-E002: Panameer jobs and External jobs in one list — All · Posted on Panameer · External · You Matched · Applied.
  const kind = KINDS.find(([k]) => k === (rawKind === "interested" ? "applied" : rawKind))?.[0] ?? "all";
  const rows = all.filter((r) => r.type === "Job" && r.donut === "jobs" && (!filters.q || filters.q.toLowerCase().split(/\s+/).every((w) => `${r.what} ${r.who}`.toLowerCase().includes(w))));
  const orderN = (slice: string) => all.filter((r) => r.type === "Order" && r.slice === slice).length;
  const stage = JOB_STAGES.find((s) => s === raw) ?? "all";
  const staged = stage === "all" ? rows : rows.filter((r) => r.slice === stage);
  const list = kind === "external" || kind === "applied" ? [] : kind === "matched" ? rows.filter((r) => r.slice === "You Matched") : staged;
  const ext = kind === "posted" || stage !== "all" ? [] : kind === "matched" ? external.filter((e) => e.matched > 0) : kind === "applied" ? external.filter((e) => e.interested && (!rawExt || e.stageKey === rawExt)) : external;
  const kindN: Record<string, number> = { all: rows.length + external.length, posted: rows.length, external: external.length, matched: rows.filter((r) => r.slice === "You Matched").length + external.filter((e) => e.matched > 0).length, applied: external.filter((e) => e.interested).length };
  const open = await prisma.job.count({ where: { kind: "JOB", status: "OPEN" } });
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6" data-work-jobs>
      <AppCrumb app="Work" href="/work/home" page="Jobs for You" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold">Jobs for You</h1>
          <p className="text-[14px] text-ink-2">Jobs that match your skills, and every job you&apos;ve touched. {open.toLocaleString("en-US")} open jobs on Panameer.</p>
        </div>
        <Link href="/work/jobs?kind=matched" className={BTN}>Browse the Job Board</Link>
      </div>
      {/* WA-E002: the flow's strip — a step filters the list; "n Actions →" opens the Worklist for that step. */}
      <div className="mt-4"><StageBand label="Jobs for You" current={stage === "all" ? undefined : stage} actions={actions} steps={[
        ...JOB_STAGES.map((s) => ({ key: s, label: s, n: rows.filter((r) => r.slice === s).length, href: jobsHref(s), groups: STEP_GROUPS[s] })),
        { key: "Order to Accept", label: "Order to Accept", n: orderN("To Accept"), href: "/orders/overview", groups: ["Orders to Accept"] },
        { key: "Order Active", label: "Order Active", n: orderN("Active"), href: "/orders/overview" },
      ]} />{stage !== "all" && <Link href={jobsHref()} className="mb-3 mt-2 inline-block text-[12.5px] font-semibold text-ink-2 underline">Show All</Link>}</div>
      <JobFilterBar action="/work/jobs" values={toParams(filters)} sources={sources} digest={want.digest} hidden={kind !== "all" ? { kind } : {}} />
      {/* XA-E002: your applications to external jobs, by stage (Not Selected and Closed stay in the list). */}
      {external.some((e) => e.interested) && <div className="mt-2"><StageBand label="Your External Applications" actions={[]} current={rawExt && EXT_STAGE_LABEL[rawExt as keyof typeof EXT_STAGE_LABEL]} steps={EXT_PIE.map((k) => ({ key: EXT_STAGE_LABEL[k], label: EXT_STAGE_LABEL[k], n: external.filter((e) => e.stageKey === k).length, href: `/work/jobs?kind=applied&ext=${k}` }))} /></div>}
      <nav aria-label="Kinds" className="mb-3 mt-3 flex flex-wrap gap-1.5 text-[12.5px]" data-job-kinds>
        {KINDS.map(([k, l]) => <Link key={k} href={k === "all" ? jobsHref() : `/work/jobs?kind=${k}`} aria-current={kind === k ? "page" : undefined} className={kind === k ? "rounded-full border border-ink bg-ink px-3 py-1 font-semibold text-surface" : "rounded-full border border-line px-3 py-1 font-semibold hover:border-ink"}>{l}<span className="ml-1.5 tabular-nums opacity-70">{kindN[k]}</span></Link>)}
      </nav>
      <ul className="divide-y divide-line border-y border-line">
        {list.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-3 py-3" data-work-job={r.slice}>
            <span className="min-w-0 flex-1"><Link href={r.href} className="block truncate text-[15px] font-bold hover:underline">{r.what}</Link><span className="text-[12.5px] text-ink-2"><b className="font-semibold text-ink">Posted on Panameer</b> · {r.who}</span></span>
            <span className="text-[13px] tabular-nums">{r.amount}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${PILL[r.tone]}`}>{r.status}</span>
            <span className="w-full text-[12.5px] text-ink-2 sm:w-auto">{r.waitingOnYou ? `Your Next Step: ${r.next}` : r.waitingOn !== "—" ? `Waiting on ${r.waitingOn}` : ""}</span>
            <Link href={r.href} className={ACTION[r.slice] ? BTN : BTN_OUT}>{ACTION[r.slice] ?? "View"}</Link>
          </li>
        ))}
        {ext.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 py-3" data-external-job={e.source}>
            <span className="min-w-0 flex-1">
              <Link href={`/work/external/${e.id}`} className="block truncate text-[15px] font-bold hover:underline">{e.title}</Link>
              <span className="text-[12.5px] text-ink-2"><b className="font-semibold text-state-inactive">{sourceLabel(e.source)}</b> · {[e.company, e.workType ?? e.location, e.salary].filter(Boolean).join(" · ")}{e.matched ? ` · matches ${e.matched} of your skills` : ""}</span>
            </span>
            <ExternalRowAction e={e} admin={viewer.isSystemAdmin} />
          </li>
        ))}
        {!list.length && !ext.length && <li className="py-6 text-[14px] text-ink-3">Nothing here.</li>}
      </ul>
      <AlsoIn app="Work" links={[["Estimates", "/work/estimates"], ["Product Orders", "/work/product-orders"], ["Catalog", "/catalog"]]} />
    </div>
  );
}
