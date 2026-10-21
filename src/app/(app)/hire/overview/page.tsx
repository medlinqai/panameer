import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { appCounts } from "@/lib/attention";
import { buyerHireTabs, buyerLiveWork, buyerTests, hireToday, weekInterviews, type JobTabRow } from "@/lib/live-work";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { WeekSchedule } from "@/components/home/LiveWork";
import { InterviewCards } from "@/components/work/InterviewCards";
import { NeutralAvatar } from "@/components/Avatar";
import { TypeArt } from "@/components/shop/TypeArt";
import { RecurringLine, SliceChips } from "@/components/casing/SliceChips";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";
import { PATH_STEPS } from "@/lib/work-request-path";
import { BTN, BTN_OUT, Fact, GREEN, HeadRow, HireTabBar, LABEL, PathBand, RedDot, shortDate, shortWhen, type BandStep } from "@/components/hire/HireUI";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hire · Panameer" };

const TABS = ["overview", "jobs", "requests", "interviews", "tests"] as const;
type Tab = (typeof TABS)[number];
type SP = { tab?: string; step?: string; view?: string; slice?: string; q?: string };

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
  ];
  return (
    <div className="pm-white-page">
      <HireTabBar tabs={tabs} current={tab} right={<Link href="/hire" className={`${BTN} shrink-0 px-3 text-[13px] sm:px-5 sm:text-[14px]`} data-post-job>Post a Job</Link>} />
      <div className="mx-auto w-full max-w-[1120px] pb-14 pt-8">
        {tab === "overview" && <Overview personId={me.id} slice={sp.slice} view={sp.view ?? null} />}
        {tab === "jobs" && <JobsTab personId={me.id} step={sp.step ?? null} slice={sp.slice} q={sp.q ?? ""} />}
        {tab === "requests" && <RequestsTab personId={me.id} slice={sp.slice} />}
        {tab === "interviews" && <InterviewsTab personId={me.id} view={sp.view ?? null} slice={sp.slice} />}
        {tab === "tests" && <TestsTab personId={me.id} slice={sp.slice} />}
      </div>
    </div>
  );
}

// ── HL-E001 ──────────────────────────────────────────────────────────────────────────────────────────────────
const NEEDS_STEP: Record<string, string> = { proposals: "proposals", accept: "wo", approval: "approval", confirm: "interview", interview: "interview", tests: "test", closing: "proposals", expired: "proposals" };

async function Overview({ personId, slice, view }: { personId: string; slice?: string; view: string | null }) {
  const [today, w, tabs] = await Promise.all([hireToday(personId), buyerLiveWork(personId), buyerHireTabs(personId)]);
  const n = today.items.length;
  const needs = new Set(today.items.map((i) => NEEDS_STEP[i.kind]));
  const counts = new Map(w.strip.map((s) => [s.key, s.count]));
  const firstNeed = PATH_STEPS.findIndex((s) => needs.has(s.key));
  const lastBusy = Math.max(-1, ...PATH_STEPS.map((s, i) => (s.key !== "wo" && (counts.get(s.key) ?? 0) > 0 ? i : -1)));
  const active = firstNeed >= 0 ? firstNeed : lastBusy;
  const band: BandStep[] = PATH_STEPS.map((s, i) => {
    const c = counts.get(s.key) ?? 0;
    return { key: s.key, label: s.key === "wo" ? "Work Order" : s.label, top: <span className={`text-[22px] font-extrabold ${c ? (i === active ? "text-magenta" : "text-ink") : "text-[#c9c4d6]"}`}>{c}</span>, bar: i <= active ? "done" : "todo", current: i === active, needs: needs.has(s.key), href: `/hire/overview?tab=jobs&step=${s.key}`, muted: !c && i !== active };
  });
  const s = sliceOf(slice);
  const rows = tabs.jobRows.filter((j) => inSlice(j, s));
  const recent = rows.filter((j) => !j.old).slice(0, 6);
  const older = rows.filter((j) => j.old).length;
  const week = view === "week" ? await weekInterviews("buyer", personId) : null;
  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-start gap-10" data-hire-today>
        <div className="min-w-0 flex-[1_1_320px]">
          <span className="text-[12px] font-bold tracking-[0.12em] text-magenta">{dateLabel}</span>
          <h1 className="mb-2.5 mt-2 text-[28px] font-extrabold leading-[1.15] sm:text-[34px]">{n ? `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you today` : "Nothing needs you today"}</h1>
          <p className="text-[15px] leading-relaxed text-[#5d5768]">{today.sentence}</p>
        </div>
        {n > 0 && (
          <div className="flex min-w-0 flex-[1_1_480px] flex-col border-b border-[#e7e5ec]">
            {today.items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-3.5 border-t border-[#e7e5ec] py-4 sm:flex-nowrap" data-today-item={it.kind}>
                <RedDot />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{it.what}</div>
                  <div className="text-[13px] text-[#5d5768]">{it.detail}</div>
                </div>
                <Link href={it.href} className={`${BTN_OUT} w-full sm:w-auto`}>{it.action}</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <PathBand steps={band} label="Work Request path" />

      <section className="flex flex-wrap items-start gap-12">
        <div className="min-w-0 flex-[999_1_560px]" data-my-jobs>
          <HeadRow title="My Jobs"><SliceChips tabKey="hire-overview-jobs" counts={sliceCounts(tabs.jobRows)} base="/hire/overview" /></HeadRow>
          {recent.length ? recent.map((j) => <CompactJob key={j.id} j={j} />) : <p className="py-5 text-[14px] text-[#5d5768]">No jobs here. <Link href="/hire">Post a Job</Link> and it shows here with its next step.</p>}
          <p className="mt-3.5 text-[13px] text-[#5d5768]">Older than 5 days ({older}) · <Link href="/hire/overview?tab=jobs" className="font-semibold">See all jobs</Link></p>
        </div>
        <aside className="min-w-0 flex-[1_1_300px]">
          {week ? <WeekSchedule start={week.start} rows={week.rows} side="buyer" backHref="/hire/overview" /> : (
            <>
              <HeadRow title="Today's Interviews"><Link href="/hire/overview?view=week" className="text-[13px] font-semibold">View week</Link></HeadRow>
              {w.todays.length ? (
                <ul>{w.todays.map((iv) => (
                  <li key={iv.id} className="flex items-center gap-3 border-b border-[#e7e5ec] py-3.5">
                    <b className="w-[64px] shrink-0 text-[14px] tabular-nums">{iv.startsAt ? new Date(iv.startsAt).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }) : "—"}</b>
                    <NeutralAvatar size={32} />
                    <span className="min-w-0 flex-1"><b className="block text-[14px]">{iv.providerLabel}</b><span className="block truncate text-[12.5px] text-[#5d5768]">{iv.jobTitle}</span></span>
                    {iv.hasRoom ? <a href={`/api/interviews/${iv.id}/join`} target="_blank" rel="noreferrer" className={BTN}>Join</a> : <Link href={`/work-requests/${iv.jobId}#interviews`} className={BTN_OUT}>Open</Link>}
                  </li>
                ))}</ul>
              ) : <p className="border-b border-[#e7e5ec] py-5 text-[14px] leading-relaxed text-[#5d5768]">No interviews today. Interviews you schedule from a job&apos;s proposals show here, with a Join link.</p>}
            </>
          )}
          <div className="mt-7 grid grid-cols-2 gap-4">
            <div><div className="text-[26px] font-extrabold">{w.footer.openJobs}</div><div className={LABEL}>Open jobs</div></div>
            <div><div className="text-[26px] font-extrabold">{w.footer.monthOrders}</div><div className={LABEL}>Work Orders this month</div></div>
          </div>
        </aside>
      </section>
    </div>
  );
}

const stepLabel = (j: JobTabRow) => {
  const base = PATH_STEPS.find((p) => p.key === j.step)?.label ?? j.step;
  if (j.step === "proposals" && j.proposals) return `${base} · ${j.proposals.replace(/ in$/, "")}`;
  if (j.step === "wo") return `Work Order · ${j.wo?.waiting === "You, then the provider" ? "waiting on you to accept" : j.wo?.waiting === "The provider" ? "waiting on the provider" : j.wo?.waiting.toLowerCase() ?? "created"}`;
  return base;
};

function CompactJob({ j }: { j: JobTabRow }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-[#e7e5ec] py-[18px] sm:flex-nowrap" data-compact-job>
      <TypeArt category={j.category} size={52} />
      <div className="min-w-0 flex-1">
        <Link href={`/work-requests/${j.id}`} className="block text-[15px] font-bold text-ink hover:underline">{j.title}</Link>
        <div className="mt-0.5 text-[13px] text-[#5d5768]">{[j.posted ? `Posted ${shortDate(j.posted)}` : null, j.facts.split(" · ").find((x) => x.startsWith("$")), j.origin].filter(Boolean).join(" · ")}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px]">
          <span className={`font-bold ${j.needsAction ? "text-magenta" : "text-ink"}`}>{j.completed ? "Completed" : stepLabel(j)}</span>
          {(j.rates || j.due) && j.step === "proposals" && <span className="text-[#5d5768]">{[j.rates, j.due ? `due ${j.due}` : null].filter(Boolean).join(" · ")}</span>}
        </div>
        {j.recurring && <RecurringLine r={j.recurring} />}
      </div>
      {j.action && <Link href={j.action.href} className={`${j.needsAction ? BTN : BTN_OUT} w-full sm:w-auto`}>{j.action.label}</Link>}
    </div>
  );
}

// ── HL-E002 ──────────────────────────────────────────────────────────────────────────────────────────────────
async function JobsTab({ personId, step, slice, q }: { personId: string; step: string | null; slice?: string; q: string }) {
  const { jobRows } = await buyerHireTabs(personId);
  const s = sliceOf(slice);
  const needle = q.trim().toLowerCase();
  const list = jobRows
    .filter((j) => (!step || j.step === step) && inSlice(j, s) && (!needle || `${j.title} ${j.ref ?? ""} ${j.facts}`.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.needsAction) - Number(a.needsAction) || (a.deadlineAt ?? "9").localeCompare(b.deadlineAt ?? "9"));
  const recent = list.filter((j) => !j.old);
  const older = list.filter((j) => j.old);
  return (
    <div className="flex flex-col gap-5" data-jobs-tab>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[30px] font-extrabold">Jobs{step ? <small className="ml-2 text-[13px] font-semibold text-[#5d5768]">at {PATH_STEPS.find((p) => p.key === step)?.label} · <Link href="/hire/overview?tab=jobs">all</Link></small> : null}</h1>
        <form action="/hire/overview" className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[#5d5768] sm:w-[360px]">
          <input type="hidden" name="tab" value="jobs" />
          <label htmlFor="job-search">Search jobs</label>
          <input id="job-search" type="search" name="q" defaultValue={q} placeholder="Title, skill or JB number" className="border border-[#c9c4d6] px-3 py-2.5 text-[14px] text-ink" />
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-ink pb-3">
        <SliceChips tabKey="hire-jobs" counts={sliceCounts(jobRows)} base={step ? `/hire/overview?tab=jobs&step=${step}` : "/hire/overview?tab=jobs"} />
        <span className="flex-1" />
        <span className="text-[12px] text-[#5d5768]">Sorted by what needs you first</span>
      </div>
      {recent.length ? recent.map((j) => <JobArticle key={j.id} j={j} />) : <p className="text-[14px] text-[#5d5768]">No jobs here.</p>}
      {older.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[13px] text-[#5d5768]">Older than 5 days ({older.length})</summary>
          <div className="mt-3 flex flex-col gap-5">{older.map((j) => <JobArticle key={j.id} j={j} />)}</div>
        </details>
      ) : <p className="text-[13px] text-[#5d5768]">Older than 5 days (0)</p>}
    </div>
  );
}

function JobArticle({ j }: { j: JobTabRow }) {
  const woStep = j.step === "wo" || j.step === "award" || j.step === "approval";
  return (
    <article className="flex flex-col gap-3.5 border-b border-[#e7e5ec] pb-[22px] pt-1" data-job-article>
      <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
        <TypeArt category={j.category} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {j.needsAction && <RedDot size={9} />}
            <Link href={`/work-requests/${j.id}`} className="text-[17px] font-bold text-ink hover:underline">{j.title}</Link>
          </div>
          <div className="mt-1 text-[13px] text-[#5d5768]">{j.facts}{j.origin && !j.facts.includes(j.origin) ? ` · ${j.origin}` : ""}</div>
          {j.recurring && <RecurringLine r={j.recurring} />}
        </div>
        {j.completed ? <Link href="/hire" className={`${BTN_OUT} w-full sm:w-auto`}>Hire Again</Link> : j.action && <Link href={j.action.href} className={`${j.needsAction ? BTN : BTN_OUT} w-full sm:w-auto`}>{j.action.label}</Link>}
      </div>
      <div className="grid grid-cols-2 gap-4 border border-[#e7e5ec] bg-[#faf9fb] px-4 py-3.5 sm:ml-[68px] sm:grid-cols-4" data-facts-strip>
        {woStep && j.wo ? (
          <>
            <Fact label="Step"><span className="text-ink">{PATH_STEPS.find((p) => p.key === j.step)?.label}</span></Fact>
            <Fact label="Work Order"><Link href={`/orders/${j.wo.id}`} className="text-ink">{j.wo.number}</Link></Fact>
            <Fact label="Provider">{j.wo.provider}</Fact>
            <Fact label="Waiting on">{j.wo.waiting}</Fact>
          </>
        ) : (
          <>
            <Fact label="Step"><span className={j.completed ? "" : "text-magenta"}>{j.completed ? "Completed" : PATH_STEPS.find((p) => p.key === j.step)?.label ?? j.step}</span></Fact>
            <Fact label="Proposals">{j.proposals ?? "—"}</Fact>
            <Fact label="Rates proposed">{j.rates ?? "—"}{j.rates && j.inRange != null && <span className={`font-medium ${j.inRange ? GREEN : "text-[#d92d20]"}`}> · {j.inRange ? "in range" : "over range"}</span>}</Fact>
            <Fact label="Deadline">{j.deadlineAt ? shortWhen(j.deadlineAt) : "—"}</Fact>
          </>
        )}
      </div>
      {!woStep && (j.proposalLines.length > 0 || j.asked > 0) && (
        <div className="flex flex-col sm:ml-[68px]">
          {j.proposalLines.map((p) => (
            <div key={p.personId} className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-[#f0eef3] py-2.5" data-proposal-line>
              <NeutralAvatar size={32} />
              <span className="w-[70px] text-[14px] font-bold">{p.who}</span>
              <span className="min-w-0 flex-1 text-[13px] text-[#5d5768]">{p.summary}</span>
              <span className="text-[14px] font-bold">{p.rate ?? "—"}</span>
              <span className="w-[110px] text-[13px] text-[#5d5768]">{p.start ?? ""}</span>
              {j.eventId && <Link href={`/hire/sourcing/${j.eventId}`} className="text-[13px] font-semibold">Compare</Link>}
            </div>
          ))}
          {j.asked === 1 && (
            <div className="flex items-center gap-3.5 border-t border-[#f0eef3] py-2.5 text-[13px] text-[#8a8494]">
              <span className="w-8 shrink-0" />No other providers were asked. <Link href={`/work-requests/${j.id}#matches`}>Request more proposals</Link>
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
      <h1 className="text-[30px] font-extrabold">Work Requests</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey="hire-requests" counts={sliceCounts(all)} base="/hire/overview?tab=requests" /></div>
      {rows.length ? rows.map((w) => (
        <article key={w.id} className="flex flex-col gap-3.5 border-b border-[#e7e5ec] pb-5">
          <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <TypeArt typeName={w.title} size={52} />
            <div className="min-w-0 flex-1">
              <Link href={`/work-requests/${w.jobId}`} className="text-[17px] font-bold text-ink hover:underline">{w.title}</Link>
              <div className="mt-1 text-[13px] text-[#5d5768]">{w.wr ?? "Work Request"} · {w.who}</div>
              {w.recurring && <RecurringLine r={w.recurring} />}
            </div>
            {w.completed ? <Link href={`/hire/terms?job=${w.jobId}&provider=${w.providerPersonId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Hire Again</Link> : <Link href={w.wo ? `/orders/${w.wo.id}` : `/work-requests/${w.jobId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Open</Link>}
          </div>
          <div className="grid grid-cols-2 gap-4 border border-[#e7e5ec] bg-[#faf9fb] px-4 py-3.5 sm:ml-[68px] sm:grid-cols-4">
            <Fact label="Step">{w.completed ? "Completed" : w.step}</Fact>
            <Fact label="Provider">{w.who}</Fact>
            <Fact label="Approval">{w.approval}</Fact>
            <Fact label="Work Order">{w.wo ? <Link href={`/orders/${w.wo.id}`} className="text-ink">{w.wo.number}</Link> : "—"}</Fact>
          </div>
        </article>
      )) : <p className="text-[14px] text-[#5d5768]">No Work Requests yet — Award a proposal or Hire directly and it shows here.</p>}
    </div>
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
    <div className="flex flex-col gap-5" data-interviews-tab>
      <div className="flex flex-wrap items-end justify-between gap-3"><h1 className="text-[30px] font-extrabold">Interviews</h1><Link href="/hire/overview?tab=interviews&view=week" className="text-[13px] font-semibold">View week</Link></div>
      <div className="border-b border-ink pb-3"><SliceChips tabKey="hire-interviews" counts={sliceCounts(all)} base="/hire/overview?tab=interviews" /></div>
      {rows.length ? <InterviewCards rows={rows} side="buyer" videoReady={dailyConfigured()} /> : <p className="text-[14px] text-[#5d5768]">No interviews here. Use Interview on a proposal; times, Join links and notes show here.</p>}
    </div>
  );
}

async function TestsTab({ personId, slice }: { personId: string; slice?: string }) {
  const all = await buyerTests(personId);
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <div className="flex flex-col gap-5" data-tests-tab>
      <h1 className="text-[30px] font-extrabold">Tests</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey="hire-tests" counts={sliceCounts(all)} base="/hire/overview?tab=tests" /></div>
      {rows.length ? rows.map((t) => (
        <article key={t.id} className="flex flex-col gap-3.5 border-b border-[#e7e5ec] pb-5">
          <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <NeutralAvatar size={44} />
            <div className="min-w-0 flex-1"><b className="text-[17px]">{t.who}</b><div className="mt-1 text-[13px] text-[#5d5768]">{t.skill}</div></div>
            <Link href={`/work-requests/${t.jobId}`} className={`${BTN_OUT} w-full sm:w-auto`}>Open</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 border border-[#e7e5ec] bg-[#faf9fb] px-4 py-3.5 sm:ml-[60px] sm:grid-cols-4">
            <Fact label="Skill">{t.skill}</Fact>
            <Fact label="Sent">{t.sent}</Fact>
            <Fact label="Score">{t.score != null ? `${t.score}%` : "—"}</Fact>
            <Fact label="Result"><span className={t.result === "Pass" ? GREEN : t.result === "Fail" ? "text-[#d92d20]" : ""}>{t.result}</span></Fact>
          </div>
        </article>
      )) : <p className="text-[14px] text-[#5d5768]">No test requests yet. Use Request Test on a proposal; scores and pass / fail show here.</p>}
    </div>
  );
}
