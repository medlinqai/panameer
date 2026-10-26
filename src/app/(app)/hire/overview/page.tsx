import { LiveRefresh } from "@/components/LiveRefresh";
import Link from "next/link";
import { ProposalActions } from "@/components/work/ProposalActions";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { appCounts } from "@/lib/attention";
import { buyerHireTabs, buyerLiveWork, buyerTests, hireOverviewData, type JobTabRow } from "@/lib/live-work";
import { AttentionGroups } from "@/components/hire/AttentionGroups";
import { DiscardDraft } from "@/components/hire/DiscardDraft";
import { InterviewWorkday, WorkdayWeek } from "@/components/work/InterviewWorkday";
import { gridDay, interviewGrid, rowsOn } from "@/lib/interview-grid";
import { invitedNotBooked, myOpenTimes } from "@/lib/open-times";
import { InvitedNotBooked, OpenTimesButton } from "@/components/hire/OpenTimes";
import { QuestionBanks } from "@/components/hire/QuestionBanks";
import { JOB_STAGE_LABEL, JOB_STAGE_STATE, type JobStage } from "@/lib/job-stage";
import { listBanks } from "@/lib/question-banks";
import { NeutralAvatar } from "@/components/Avatar";
import { TypeArt } from "@/components/shop/TypeArt";
import { RecurringLine, SliceChips } from "@/components/casing/SliceChips";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";
import { PATH_STEPS } from "@/lib/work-request-path";
import { BTN, BTN_OUT, Fact, GREEN, HeadRow, STATE_TEXT, stepState, HireTabBar, LABEL, PathBand, RedDot, shortDate, shortWhen, type BandStep } from "@/components/hire/HireUI";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire · Panameer" };

const TABS = ["overview", "jobs", "requests", "interviews", "tests", "questions"] as const;
type Tab = (typeof TABS)[number];
type SP = { tab?: string; step?: string; view?: string; slice?: string; q?: string; show?: string; date?: string };

// RA-E004/E005 + HL-E001–E005: the buyer's Request app home, styled to Scott's mockups (10-21).
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const viewer = await guardPage("canHireTalent");
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "overview";
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return null;
  const r = (await appCounts(viewer, "buyer")).request;
  const tabs = [
    { key: "overview", label: "Overview", href: "/hire/overview" },
    { key: "jobs", label: "Jobs", href: "/hire/overview?tab=jobs", n: r.jobs },
    { key: "requests", label: "Requests", href: "/hire/overview?tab=requests", n: r.requests },
    { key: "interviews", label: "Interviews", href: "/hire/overview?tab=interviews", n: r.interviews },
    { key: "tests", label: "Tests", href: "/hire/overview?tab=tests", n: r.tests },
    { key: "questions", label: "Questions", href: "/hire/overview?tab=questions" },
  ];
  return (
    <div className="pm-white-page">
      <LiveRefresh />
      <HireTabBar tabs={tabs} current={tab} right={
        <span className="flex shrink-0 gap-2">
          <Link href="/hire" className={`${BTN} shrink-0 px-3 text-[13px] sm:px-5 sm:text-[14px]`} data-post-job>Create a Job</Link>
        </span>
      } />
      <div className="mx-auto w-full max-w-[1120px] pb-14 pt-8">
        {tab === "overview" && <Overview personId={me.id} slice={sp.slice} />}
        {tab === "jobs" && <JobsTab personId={me.id} step={sp.step ?? null} slice={sp.slice} q={sp.q ?? ""} />}
        {tab === "requests" && <RequestsTab personId={me.id} slice={sp.slice} />}
        {tab === "interviews" && <InterviewsTab personId={me.id} userId={viewer.userId} view={sp.view ?? null} show={sp.show ?? null} date={sp.date ?? null} />}
        {tab === "tests" && <TestsTab personId={me.id} slice={sp.slice} />}
        {tab === "questions" && <QuestionBanks banks={await listBanks(viewer).catch(() => [])} />}
      </div>
    </div>
  );
}

// ── HL-E001 + HB-E003/E004/E006/E007: one source for everything on the Overview ───────────────────────────────
/** HB-E004: In Process excludes drafts; Drafts is its own chip. */
// JR-E001: Jobs by status — Active · Comparing · Request to Hire · Filled · On Hold · Closed · Drafts · All.
const STAGE_CHIPS: [string, string][] = [["active", "Active"], ["comparing", "Comparing"], ["request_to_hire", "Request to Hire"], ["filled", "Filled"], ["on_hold", "On Hold"], ["closed", "Closed"], ["drafts", "Drafts"], ["all", "All"]];
const CHIP_STAGE: Record<string, JobStage> = { active: "ACTIVE", comparing: "COMPARING", request_to_hire: "REQUEST_TO_HIRE", filled: "FILLED", on_hold: "ON_HOLD", closed: "CLOSED", drafts: "DRAFT" };
const DONE: JobStage[] = ["FILLED", "CLOSED"];
const jobSlice = (rows: JobTabRow[], slice?: string) => {
  const st = CHIP_STAGE[slice ?? "all"];
  return st ? rows.filter((j) => j.stage === st) : [...rows].sort((a, b) => Number(DONE.includes(a.stage)) - Number(DONE.includes(b.stage)));
};
const jobSliceCounts = (rows: JobTabRow[]) => ({ ...Object.fromEntries(Object.entries(CHIP_STAGE).map(([k, st]) => [k, rows.filter((j) => j.stage === st).length])), all: rows.length });

async function Overview({ personId, slice }: { personId: string; slice?: string }) {
  const [d, w] = await Promise.all([hireOverviewData(personId), buyerLiveWork(personId)]);
  const n = d.count;
  // MD-E006: the six Job Timeline steps (+ Order Created) — each job counted once, at its current step.
  const asked = new Set((await prisma.questionSet.findMany({ where: { job_id: { in: d.jobRows.map((j) => j.id) } }, select: { job_id: true } })).map((q) => q.job_id));
  const TIMELINE: { key: string; label: string; steps: string[]; step: string }[] = [
    { key: "create", label: "1. Create Job", steps: ["job"], step: "job" },
    { key: "choose", label: "2. Choose Provider(s)", steps: ["shortlist"], step: "shortlist" },
    { key: "availability", label: "3. Request Availability", steps: ["request", "proposals"], step: "proposals" },
    { key: "questions", label: "4. Ask Questions", steps: [], step: "proposals" },
    { key: "interview", label: "5. Interview Provider(s)", steps: ["interview", "test"], step: "interview" },
    { key: "hire", label: "6. Request to Hire", steps: ["award", "approval"], step: "award" },
    { key: "wo", label: "Order Created", steps: ["wo"], step: "wo" },
  ];
  const live = d.jobRows.filter((j) => !j.draft && !j.completed);
  const countFor = (t: (typeof TIMELINE)[number]) => t.key === "questions" ? live.filter((j) => asked.has(j.id) && ["request", "proposals"].includes(j.step)).length
    : t.key === "availability" ? live.filter((j) => t.steps.includes(j.step) && !asked.has(j.id)).length
    : t.key === "wo" ? d.jobRows.filter((j) => j.step === "wo").length : live.filter((j) => t.steps.includes(j.step)).length;
  const counts = TIMELINE.map(countFor);
  const needs: Record<string, boolean> = { availability: d.needs.proposals, questions: d.needs.proposals, interview: d.needs.interview || d.needs.test };
  const firstNeed = TIMELINE.findIndex((t, i) => needs[t.key] && counts[i] > 0);
  const lastBusy = Math.max(-1, ...TIMELINE.map((t, i) => (t.key !== "wo" && counts[i] > 0 ? i : -1)));
  const active = firstNeed >= 0 ? firstNeed : lastBusy;
  const band: BandStep[] = TIMELINE.map((t, i) => {
    const c = counts[i];
    const label = t.key === "wo" ? <>Order Created · <span className="text-magenta-dark">Orders →</span></> : t.label;
    return { key: t.key, label, top: <span className={`text-[22px] font-extrabold ${c ? (i === active ? "text-magenta" : "text-ink") : "text-state-border"}`}>{c}</span>, bar: i <= active ? "done" : "todo", current: i === active, needs: c > 0 && !!needs[t.key], href: t.key === "wo" ? "/orders/overview" : `/hire/overview?tab=jobs&step=${t.step}`, muted: !c && i !== active };
  });
  const rows = jobSlice(d.jobRows, slice);
  const recent = rows.filter((j) => !j.old || j.draft).slice(0, 8);
  const older = rows.filter((j) => j.old && !j.draft).length;
  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-start gap-10" data-hire-today>
        <div className="min-w-0 flex-[1_1_300px]">
          <span className="text-[12px] font-bold tracking-[0.12em] text-magenta">{dateLabel}</span>
          <h1 className="mb-2.5 mt-2 text-[28px] font-extrabold leading-[1.15] sm:text-[34px]">{n ? `${n} ${n === 1 ? "Thing Needs" : "Things Need"} Attention` : "Nothing Needs Attention"}</h1>
          <p className="text-[14px] leading-[1.7] text-state-inactive" data-hire-summary>{d.summary}</p>
          <p className="mt-[18px] text-[13px] leading-relaxed text-state-inactive">Orders to accept are in <Link href="/orders/overview">Orders</Link>.</p>
        </div>
        <AttentionGroups groups={d.groups} />
      </section>

      <PathBand steps={band} label="Job Timeline" />

      {/* IW-E004: My Jobs takes the full width; Today's Interviews moved to the Interviews tab (the attention group links there). */}
      <section className="min-w-0" data-my-jobs>
        <HeadRow title="My Jobs"><SliceChips chips={STAGE_CHIPS} defaultKey="all" tabKey="hire-overview-jobs-stage" counts={jobSliceCounts(d.jobRows)} base="/hire/overview" /></HeadRow>
        {recent.length ? recent.map((j) => <CompactJob key={j.id} j={j} />) : <p className="py-5 text-[14px] text-state-inactive">No jobs here. <Link href="/hire">Create a Job</Link> and it shows here with its next step.</p>}
        <p className="mt-3.5 text-[13px] text-state-inactive">Older than 5 days ({older}) · <Link href="/hire/overview?tab=jobs" className="font-semibold">See All Jobs</Link></p>
      </section>
      <footer className="flex flex-wrap gap-x-10 gap-y-2 border-t border-state-border pt-4 text-[13px] text-state-inactive" data-hire-footer>
        <span><b className="text-[15px] font-extrabold text-ink">{d.openJobs}</b> Open Jobs</span>
        <span><b className="text-[15px] font-extrabold text-ink">{w.footer.monthOrders}</b> Orders This Month</span>
      </footer>
    </div>
  );
}

/** JS-E001: the status word, then the step while the job is live (or the reason it was closed). */
const stageLine = (j: JobTabRow) => j.stage === "ACTIVE" || j.stage === "COMPARING" ? `${JOB_STAGE_LABEL[j.stage]} · ${stepLabel(j)}` : (j.stage === "CLOSED" || j.stage === "ON_HOLD") && j.closedReason ? `${JOB_STAGE_LABEL[j.stage]} · ${j.closedReason}` : JOB_STAGE_LABEL[j.stage];
const stepLabel = (j: JobTabRow) => {
  if (j.draft) return j.draftLine ?? "Draft";
  const base = PATH_STEPS.find((p) => p.key === j.step)?.label ?? j.step;
  if (j.step === "proposals" && j.proposals) return `${base} · ${j.proposals.replace(/ in$/, "")}`;
  if (j.step === "wo") return `Order ${j.wo?.number ?? ""} created`.replace("  ", " ");
  return base;
};

function CompactJob({ j }: { j: JobTabRow }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 border-b border-state-border py-[18px] sm:flex-nowrap ${DONE.includes(j.stage) ? "opacity-60" : ""}`} data-compact-job>
      <TypeArt category={j.category} size={52} />
      <div className="min-w-0 flex-1">
        <Link href={`/work-requests/${j.id}`} className="block text-[15px] font-bold text-ink hover:underline">{j.title}</Link>
        <div className="mt-0.5 text-[13px] text-state-inactive">{[j.posted ? `Posted ${shortDate(j.posted)}` : null, j.facts.split(" · ").find((x) => x.startsWith("$")), j.origin].filter(Boolean).join(" · ")}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px]">
          <span className={`font-bold ${STATE_TEXT[JOB_STAGE_STATE[j.stage]]}`} data-job-stage={j.stage}>{stageLine(j)}</span>
          {(j.rates || j.due) && j.step === "proposals" && <span className="text-state-inactive">{[j.rates, j.due ? `due ${j.due}` : null].filter(Boolean).join(" · ")}</span>}
        </div>
        {j.recurring && <RecurringLine r={j.recurring} />}
      </div>
      <span className="flex w-full gap-2 sm:w-auto">
        {j.action && <Link href={j.action.href} className={`${j.needsAction ? BTN : BTN_OUT} flex-1 sm:flex-none`}>{j.action.label}</Link>}
        {j.draft && <DiscardDraft jobId={j.id} />}
      </span>
    </div>
  );
}

// ── HL-E002 ──────────────────────────────────────────────────────────────────────────────────────────────────
async function JobsTab({ personId, step, slice, q }: { personId: string; step: string | null; slice?: string; q: string }) {
  const { jobRows } = await buyerHireTabs(personId);
  const needle = q.trim().toLowerCase();
  const list = jobSlice(jobRows, slice)
    .filter((j) => (!step || j.step === step) && (!needle || `${j.title} ${j.ref ?? ""} ${j.facts}`.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.needsAction) - Number(a.needsAction) || (b.posted ? new Date(b.posted).getTime() : 0) - (a.posted ? new Date(a.posted).getTime() : 0)); // Scott 10-22: newest first
  const recent = list.filter((j) => !j.old);
  const older = list.filter((j) => j.old);
  return (
    <div className="flex flex-col gap-5" data-jobs-tab>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[30px] font-extrabold">Jobs{step ? <small className="ml-2 text-[13px] font-semibold text-state-inactive">at {PATH_STEPS.find((p) => p.key === step)?.label} · <Link href="/hire/overview?tab=jobs">all</Link></small> : null}</h1>
        <form action="/hire/overview" className="flex w-full flex-col gap-1 text-[12px] font-semibold text-state-inactive sm:w-[360px]">
          <input type="hidden" name="tab" value="jobs" />
          <label htmlFor="job-search">Search jobs</label>
          <input id="job-search" type="search" name="q" defaultValue={q} placeholder="Title, skill or JB number" className="border border-state-border px-3 py-2.5 text-[14px] text-ink" />
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink pb-3">
        <SliceChips chips={STAGE_CHIPS} defaultKey="all" tabKey="hire-jobs-stage" counts={jobSliceCounts(jobRows)} base={step ? `/hire/overview?tab=jobs&step=${step}` : "/hire/overview?tab=jobs"} />
        <span className="flex-1" />
        <span className="text-[12px] text-state-inactive">Sorted by what needs you first</span>
      </div>
      {recent.length ? recent.map((j) => <JobArticle key={j.id} j={j} />) : <p className="text-[14px] text-state-inactive">No jobs here.</p>}
      {older.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[13px] text-state-inactive">Older than 5 days ({older.length})</summary>
          <div className="mt-3 flex flex-col gap-5">{older.map((j) => <JobArticle key={j.id} j={j} />)}</div>
        </details>
      ) : <p className="text-[13px] text-state-inactive">Older than 5 days (0)</p>}
    </div>
  );
}

function JobArticle({ j }: { j: JobTabRow }) {
  const woStep = j.step === "wo" || j.step === "award" || j.step === "approval";
  return (
    <article className={`flex flex-col gap-3.5 border-b border-state-border pb-[22px] pt-1 ${DONE.includes(j.stage) ? "opacity-60" : ""}`} data-job-article>
      <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
        <TypeArt category={j.category} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {j.needsAction && <RedDot size={9} />}
            <Link href={`/work-requests/${j.id}`} className="text-[17px] font-bold text-ink hover:underline">{j.title}</Link>
          </div>
          <div className="mt-1 text-[13px] text-state-inactive">{j.draft ? j.draftLine : <>{j.facts}{j.origin && !j.facts.includes(j.origin) ? ` · ${j.origin}` : ""}</>}</div>
          {j.wo && j.step === "wo" && <div className="mt-1 text-[13px]"><b className="text-state-accepted">Order {j.wo.number} created</b> · <Link href={`/orders/${j.wo.id}`}>Open in Orders</Link></div>}
          {j.recurring && <RecurringLine r={j.recurring} />}
        </div>
        <span className="flex w-full gap-2 sm:w-auto">
          {j.completed ? <Link href="/hire" className={`${BTN_OUT} flex-1 sm:flex-none`}>Hire Again</Link> : j.action && <Link href={j.action.href} className={`${j.needsAction ? BTN : BTN_OUT} flex-1 sm:flex-none`}>{j.action.label}</Link>}
          {j.draft && <DiscardDraft jobId={j.id} />}
        </span>
      </div>
      {!j.draft && (
      <div className="grid grid-cols-2 gap-4 border border-state-border bg-state-sunken/40 px-4 py-3.5 sm:ml-[68px] sm:grid-cols-4" data-facts-strip>
        {woStep && j.wo ? (
          <>
            <Fact label="Step"><span className="text-ink">{PATH_STEPS.find((p) => p.key === j.step)?.label}</span></Fact>
            <Fact label="Order"><Link href={`/orders/${j.wo.id}`} className="text-ink">{j.wo.number}</Link></Fact>
            <Fact label="Provider">{j.wo.provider}</Fact>
            <Fact label="Waiting On">{j.wo.waiting}</Fact>
          </>
        ) : (
          <>
            <Fact label="Status"><span className={STATE_TEXT[JOB_STAGE_STATE[j.stage]]} data-job-stage={j.stage}>{stageLine(j)}</span></Fact>
            <Fact label="Responses">{j.proposals ?? "—"}</Fact>
            <Fact label="Rates Offered">{j.rates ?? "—"}{j.rates && j.inRange != null && <span className={`font-medium ${j.inRange ? GREEN : "text-state-declined"}`}> · {j.inRange ? "in range" : "over range"}</span>}</Fact>
            <Fact label="Deadline">{j.deadlineAt ? shortWhen(j.deadlineAt) : "—"}</Fact>
          </>
        )}
      </div>
      )}
      {!woStep && (j.proposalLines.length > 0 || j.asked > 0) && (
        <div className="flex flex-col sm:ml-[68px]">
          {j.proposalLines.map((p) => (
            <div key={p.personId} className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-state-sunken py-2.5" data-proposal-line>
              <NeutralAvatar size={32} photoUrl={p.photoUrl} />
              <Link href={`/work-requests/${j.id}?tab=responses`} className="text-[14px] font-bold text-ink no-underline hover:underline" data-response-line>{p.who} · {p.available ? <span className="text-state-accepted">Available</span> : <span className="text-state-declined">Not This Time</span>}{p.rate ? ` · ${p.rate}` : ""}</Link>
              <span className="min-w-0 flex-1 text-[13px] text-state-inactive">{p.available ? p.summary : p.reason ? `“${p.reason}”` : ""}</span>
              {p.available && <span className="w-[110px] text-[13px] text-state-inactive">{p.start ?? ""}</span>}
              {p.proposalId && <ProposalActions compact jobId={j.id} providerPersonId={p.personId} proposalId={p.proposalId} status={p.status ?? undefined} testId={null} awarded={p.status === "AWARDED"} interviewStatus={null} testStatus={null} />}
              {j.eventId && <Link href={`/work-requests/${j.id}?tab=responses`} className="text-[13px] font-semibold">Compare</Link>}
            </div>
          ))}
          {j.asked === 1 && (
            <div className="flex items-center gap-3.5 border-t border-state-sunken py-2.5 text-[13px] text-state-disabled">
              <span className="w-8 shrink-0" />No other providers were asked. <Link href={`/work-requests/${j.id}?tab=matches`}>Request More Availability</Link>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── HL-E005: Requests / Interviews / Tests in the same row pattern ────────────────────────────────────────────
async function RequestsTab({ personId, slice }: { personId: string; slice?: string }) {
  const { requestRows: all } = await buyerHireTabs(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <div className="flex flex-col gap-5" data-requests-tab>
      <h1 className="text-[30px] font-extrabold">Requests</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey="hire-requests" counts={sliceCounts(all)} base="/hire/overview?tab=requests" /></div>
      {rows.length ? rows.map((w) => (
        <article key={w.id} className="flex flex-col gap-3.5 border-b border-state-border pb-5">
          <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <TypeArt typeName={w.title} size={52} />
            <div className="min-w-0 flex-1">
              <Link href={`/work-requests/${w.jobId}`} className="text-[17px] font-bold text-ink hover:underline">{w.title}</Link>
              <div className="mt-1 text-[13px] text-state-inactive">{w.wr ?? "Request"} · {w.who}</div>
              {w.recurring && <RecurringLine r={w.recurring} />}
            </div>
            {w.completed ? <Link href={`/hire/terms?job=${w.jobId}&provider=${w.providerPersonId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Hire Again</Link> : <Link href={w.wo ? `/orders/${w.wo.id}` : `/work-requests/${w.jobId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Open</Link>}
          </div>
          <div className="grid grid-cols-2 gap-4 border border-state-border bg-state-sunken/40 px-4 py-3.5 sm:ml-[68px] sm:grid-cols-4">
            <Fact label="Step">{w.completed ? "Completed" : w.step}</Fact>
            <Fact label="Provider">{w.who}</Fact>
            <Fact label="Approval">{w.approval}</Fact>
            <Fact label="Order">{w.wo ? <Link href={`/orders/${w.wo.id}`} className="text-ink">{w.wo.number}</Link> : "—"}</Fact>
          </div>
        </article>
      )) : <p className="text-[14px] text-state-inactive">No Requests yet — Award a response or Hire directly and it shows here.</p>}
    </div>
  );
}

async function InterviewsTab({ personId, userId, view, show, date }: { personId: string; userId: string; view: string | null; show: string | null; date: string | null }) {
  // IW-E001/E002: the Workday — tiles, a day navigator and the fixed-column grid; or the week.
  const { rows, tiles, weekStart } = await interviewGrid("buyer", personId, userId);
  if (view === "week") return <WorkdayWeek side="buyer" rows={rows} weekStart={weekStart} base="/hire/overview?tab=interviews" />;
  const day = gridDay(date);
  const list = show === "confirm" ? rows.filter((r) => r.status === "To Confirm") : show === "feedback" ? rows.filter((r) => r.status === "Done" && !r.ranked) : rowsOn(rows, day.key);
  return <InterviewWorkday side="buyer" rows={list} tiles={tiles} show={show} base="/hire/overview?tab=interviews" testsHref="/hire/overview?tab=tests" actions={<OpenTimesButton windows={await myOpenTimes(personId)} />} bottom={<InvitedNotBooked rows={await invitedNotBooked(personId)} />}
    day={{ ...day, label: day.start.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }) }} />;
}

async function TestsTab({ personId, slice }: { personId: string; slice?: string }) {
  const all = await buyerTests(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <div className="flex flex-col gap-5" data-tests-tab>
      <h1 className="text-[30px] font-extrabold">Tests</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey="hire-tests" counts={sliceCounts(all)} base="/hire/overview?tab=tests" /></div>
      {rows.length ? rows.map((t) => (
        <article key={t.id} className="flex flex-col gap-3.5 border-b border-state-border pb-5">
          <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <NeutralAvatar size={44} photoUrl={t.photoUrl} />
            <div className="min-w-0 flex-1"><b className="text-[17px]">{t.who}</b><div className="mt-1 text-[13px] text-state-inactive">{t.skill}</div></div>
            <Link href={`/work-requests/${t.jobId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Open</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 border border-state-border bg-state-sunken/40 px-4 py-3.5 sm:ml-[60px] sm:grid-cols-4">
            <Fact label="Skill">{t.skill}</Fact>
            <Fact label="Sent">{t.sent}</Fact>
            <Fact label="Score">{t.score != null ? `${t.score}%` : "—"}</Fact>
            <Fact label="Result"><span className={t.result === "Pass" ? GREEN : t.result === "Fail" ? "text-state-declined" : ""}>{t.result}</span></Fact>
          </div>
        </article>
      )) : <p className="text-[14px] text-state-inactive">No test requests yet. Use Request Test on a response; scores and pass / fail show here.</p>}
    </div>
  );
}
