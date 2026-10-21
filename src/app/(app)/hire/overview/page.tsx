import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { PageTabs } from "@/components/casing/PageTabs";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { appCounts } from "@/lib/attention";
import { buyerHireTabs, buyerLiveWork, buyerTests, weekInterviews } from "@/lib/live-work";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { TodaysInterviews, WeekSchedule, LiveWorkList } from "@/components/home/LiveWork";
import { InterviewCards } from "@/components/work/InterviewCards";
import { NeutralAvatar } from "@/components/Avatar";
import { RedDot, StripColumn } from "@/components/home/AppHome";
import { RecurringLine, SliceChips } from "@/components/casing/SliceChips";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire · Panameer" };

const TABS = ["overview", "jobs", "requests", "interviews", "tests"] as const;
type Tab = (typeof TABS)[number];

// RA-E004/E005: the buyer's Request app home — HIRE | Overview · Jobs · Requests · Interviews · Tests, red counts on each.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; step?: string; view?: string; slice?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "overview";
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return null;
  const counts = await appCounts(viewer, "buyer");
  const r = counts.request;
  const tabs = [
    { label: "Overview", href: "/hire/overview", match: "/hire/overview", badge: r.total },
    { label: "Jobs", href: "/hire/overview?tab=jobs", match: "/hire/overview?tab=jobs", badge: r.jobs },
    { label: "Requests", href: "/hire/overview?tab=requests", match: "/hire/overview?tab=requests", badge: r.requests },
    { label: "Interviews", href: "/hire/overview?tab=interviews", match: "/hire/overview?tab=interviews", badge: r.interviews },
    { label: "Tests", href: "/hire/overview?tab=tests", match: "/hire/overview?tab=tests", badge: r.tests },
  ];
  const current = tab === "overview" ? "/hire/overview" : `/hire/overview?tab=${tab}`;
  const step = sp.step ?? null;

  return (
    <div className="pm-white-page">
      <PageTabs wrap eyebrow="HIRE" sequence="none" tabs={tabs} current={current}>
        <Link href="/hire" className="ml-2 hidden min-h-9 shrink-0 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover sm:inline-flex">Post a Job</Link>
      </PageTabs>
      <div className="mx-auto w-full max-w-[1010px]">
        {tab === "overview" && <Overview personId={me.id} step={step} view={sp.view ?? null} />}
        {tab === "jobs" && <JobsTab personId={me.id} step={step} slice={sp.slice} />}
        {tab === "requests" && <RequestsTab personId={me.id} slice={sp.slice} />}
        {tab === "interviews" && <InterviewsTab personId={me.id} view={sp.view ?? null} slice={sp.slice} />}
        {tab === "tests" && <TestsTab personId={me.id} slice={sp.slice} />}
      </div>
    </div>
  );
}

async function Overview({ personId, step, view }: { personId: string; step: string | null; view: string | null }) {
  const w = await buyerLiveWork(personId);
  const stat = (id: string) => w.tiles.find((t) => t.id === id)?.count ?? 0;
  const week = view === "week" ? await weekInterviews("buyer", personId) : null;
  const today = w.rows.filter((x) => x.days === 0 && !x.old);
  return (
    <>
      <AccountHero
        testId="hire-overview-hero"
        stackKpis
        picture={<StripColumn steps={w.strip} href={(k) => `/hire/overview?tab=jobs&step=${k}`} />}
        eyebrow="Requests"
        title="What Needs You Today"
        kpis={[
          { value: stat("proposals"), label: "PROPOSALS TO REVIEW" },
          { value: w.todays.length, label: "INTERVIEWS TODAY" },
          { value: stat("accept"), label: "WORK ORDERS TO ACCEPT" },
        ]}
        paragraph={<>{w.footer.openJobs} open Job{w.footer.openJobs === 1 ? "" : "s"} · {w.footer.monthOrders} Work Order{w.footer.monthOrders === 1 ? "" : "s"} this month.</>}
        actions={<><Link href="/hire" className={HERO_BTN}>Post a Job</Link><Link href="/hire/overview?tab=jobs" className={HERO_BTN_W}>See My Jobs</Link></>}
      />
      <div className="grid md:grid-cols-2">
        <section className="min-w-0 py-6 md:border-r md:border-line md:pr-7" data-my-jobs>
          <h2 className="text-[22px] font-bold">My Jobs</h2>
          {today.length > 0 && (
            <>
              <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Today</p>
              <ul className="divide-y divide-line">{today.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2 text-[13.5px]"><span className="min-w-0 truncate font-semibold">{x.title}</span>{x.action && <Link href={x.action.href} className="shrink-0 font-semibold text-magenta-dark underline underline-offset-4">{x.action.label}</Link>}</li>)}</ul>
            </>
          )}
          <LiveWorkList title="By Step" steps={w.strip} rows={w.rows} active={step} base="/hire/overview" />
        </section>
        <section className="min-w-0 py-6 md:pl-7">
          {week ? <WeekSchedule start={week.start} rows={week.rows} side="buyer" backHref="/hire/overview" /> : <TodaysInterviews rows={w.todays} side="buyer" weekHref="/hire/overview?view=week" />}
        </section>
      </div>
    </>
  );
}

async function JobsTab({ personId, step, slice }: { personId: string; step: string | null; slice?: string }) {
  const { jobRows } = await buyerHireTabs(personId);
  const s = sliceOf(slice);
  const list = (step ? jobRows.filter((j) => j.step === step) : jobRows).filter((j) => inSlice(j, s));
  const recent = list.filter((j) => !j.old);
  const older = list.filter((j) => j.old);
  const Row = ({ j }: { j: (typeof jobRows)[number] }) => (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3" data-job-row>
      {j.needsAction ? <RedDot /> : <span className="w-2.5" />}
      <div className="min-w-0 flex-1">
        <Link href={`/work-requests/${j.id}`} className="block truncate text-[14.5px] font-bold hover:underline">{j.title}</Link>
        <p className="text-[12.5px] text-ink-2">{[j.ref, j.posted ? `posted ${new Date(j.posted).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}` : null, j.proposals ? `${j.proposals}${j.due ? ` · due ${j.due}` : ""}` : null].filter(Boolean).join(" · ")}</p>
        {(j.rates || j.booked) && <p className="text-[12.5px] text-ink-2">{[j.rates ? `Proposed ${j.rates}${j.range ? ` vs ${j.range}` : ""}` : null, j.booked].filter(Boolean).join(" · ")}</p>}
        {j.recurring && <RecurringLine r={j.recurring} />}
      </div>
      {j.completed ? <Link href="/hire" className="inline-flex min-h-9 shrink-0 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-bg-soft" data-hire-again>Hire Again</Link> : j.action && <Link href={j.action.href} className="inline-flex min-h-9 shrink-0 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover">{j.action.label}</Link>}
    </li>
  );
  return (
    <section className="py-4" data-jobs-tab>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold">Jobs{step ? <small className="ml-2 text-[13px] font-semibold text-ink-3">at this step · <Link href="/hire/overview?tab=jobs" className="text-magenta-dark underline">all</Link></small> : null}</h2>
        <Link href="/hire" className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover">Post a Job</Link>
      </div>
      <SliceChips tabKey="hire-jobs" counts={sliceCounts(jobRows)} base={step ? `/hire/overview?tab=jobs&step=${step}` : "/hire/overview?tab=jobs"} />
      {recent.length ? <ul className="mt-2 divide-y divide-line border-y border-line">{recent.map((j) => <Row key={j.id} j={j} />)}</ul> : <p className="mt-3 text-[13.5px] text-ink-3">No jobs{step ? " at this step" : " yet"}.</p>}
      {older.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Older than 5 days ({older.length})</summary>
          <ul className="divide-y divide-line">{older.map((j) => <Row key={j.id} j={j} />)}</ul>
        </details>
      )}
    </section>
  );
}

async function RequestsTab({ personId, slice }: { personId: string; slice?: string }) {
  const { requestRows: all } = await buyerHireTabs(personId);
  const s = sliceOf(slice);
  const requestRows = all.filter((r) => inSlice(r, s));
  return (
    <section className="py-4" data-requests-tab>
      <h2 className="text-[22px] font-bold">Work Requests</h2>
      <SliceChips tabKey="hire-requests" counts={sliceCounts(all)} base="/hire/overview?tab=requests" />
      {requestRows.length ? (
        <ul className="mt-2 divide-y divide-line border-y border-line text-[13.5px]">
          {requestRows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="min-w-0"><b className="font-mono">{w.wr ?? "Work Request"}</b> · {w.who} · <Link href={`/work-requests/${w.jobId}`} className="hover:underline">{w.title}</Link>{w.recurring && <RecurringLine r={w.recurring} />}</span>
              <span className="text-ink-2">{w.completed ? "Completed" : w.step} · {w.approval}{w.wo && <> · <Link href={`/orders/${w.wo.id}`} className="font-semibold text-magenta-dark underline underline-offset-4">{w.wo.number}</Link></>}{w.completed && <> · <Link href={`/hire/terms?job=${w.jobId}&provider=${w.providerPersonId}`} className="font-semibold text-magenta-dark underline underline-offset-4" data-hire-again>Hire Again</Link></>}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-[13.5px] text-ink-3">No Work Requests yet — Award a proposal or Hire directly.</p>}
    </section>
  );
}

async function InterviewsTab({ personId, view, slice }: { personId: string; view: string | null; slice?: string }) {
  if (view === "week") {
    const week = await weekInterviews("buyer", personId);
    return <WeekSchedule start={week.start} rows={week.rows} side="buyer" backHref="/hire/overview?tab=interviews" />;
  }
  const all = (await listInterviews({ buyerPersonId: personId })).map((r) => ({ ...r, completed: !["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"].includes(r.status), recurring: null }));
  const s = sliceOf(slice);
  const rows = all.filter((r) => inSlice(r, s)).sort((a, b) => (s === "completed" ? (b.startsAt ?? "").localeCompare(a.startsAt ?? "") : 0));
  return (
    <section className="py-4" data-interviews-tab>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[22px] font-bold">Interviews</h2>
        <Link href="/hire/overview?tab=interviews&view=week" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">View week</Link>
      </div>
      <div className="mt-3"><SliceChips tabKey="hire-interviews" counts={sliceCounts(all)} base="/hire/overview?tab=interviews" />{rows.length ? <InterviewCards rows={rows} side="buyer" videoReady={dailyConfigured()} /> : <p className="text-[13.5px] text-ink-3">No interviews here.</p>}</div>
    </section>
  );
}

async function TestsTab({ personId, slice }: { personId: string; slice?: string }) {
  const all = await buyerTests(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <section className="py-4" data-tests-tab>
      <h2 className="text-[22px] font-bold">Tests</h2>
      <SliceChips tabKey="hire-tests" counts={sliceCounts(all)} base="/hire/overview?tab=tests" />
      {rows.length ? (
        <ul className="mt-2 divide-y divide-line border-y border-line text-[13.5px]">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="flex items-center gap-2"><NeutralAvatar size={24} /><b>{t.who}</b> · {t.skill}</span>
              <span className="text-ink-2">sent {t.sent}{t.score != null ? ` · ${t.score}%` : ""} · <b className="text-ink">{t.result}</b></span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-[13.5px] text-ink-3">No test requests yet.</p>}
    </section>
  );
}
