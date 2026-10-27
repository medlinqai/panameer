import Link from "next/link";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { providerLiveWork, providerTests, weekInterviews } from "@/lib/live-work";
import { listInterviews } from "@/lib/interviews";
import { TodaysInterviews, WeekSchedule } from "@/components/home/LiveWork";
import { InterviewWorkday, WorkdayWeek } from "@/components/work/InterviewWorkday";
import { gridDay, interviewGrid, rowsOn } from "@/lib/interview-grid";
import { RedDot, StripColumn } from "@/components/home/AppHome";
import { SliceChips } from "@/components/casing/SliceChips";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";

// RA-E006: the provider's JOBS app home — Overview, Interviews, Tests (Find Jobs / Proposal Requests / My Proposals stay the feed).
const STEP_HREF: Record<string, string> = { requested: "/find-work?tab=invitations", submitted: "/find-work?tab=proposals", shortlisted: "/find-work?tab=proposals", interview: "/find-work?tab=interviews", awarded: "/find-work?tab=proposals", accept: "/orders" };

export async function JobsOverview({ personId, view }: { personId: string; view: string | null }) {
  const w = await providerLiveWork(personId);
  const stat = (id: string) => w.tiles.find((t) => t.id === id)?.count ?? 0;
  const week = view === "week" ? await weekInterviews("provider", personId) : null;
  const due = w.rows.filter((r) => r.step === "requested");
  return (
    <div className="mx-auto w-full max-w-[1010px]" data-jobs-overview>
      <AccountHero
        testId="jobs-overview-hero"
        stackKpis
        picture={<StripColumn steps={w.strip} href={(k) => STEP_HREF[k] ?? "/find-work"} />}
        eyebrow="Jobs"
        title="What Needs Attention"
        kpis={[
          { value: stat("due"), label: "REQUESTS DUE < 24 H" },
          { value: w.todays.length, label: "INTERVIEWS TODAY" },
          { value: stat("accept"), label: "ORDERS TO ACCEPT" },
        ]}
        actions={<><Link href="/find-work?tab=best" className={HERO_BTN}>Find Jobs</Link><Link href="/find-work?tab=proposals" className={HERO_BTN_W}>My Responses</Link></>}
      />
      <div className="grid md:grid-cols-2">
        <section className="min-w-0 py-6 md:border-r md:border-line md:pr-7" data-requests-due>
          <h2 className="text-[22px] font-bold">Availability Requests</h2>
          {due.length ? (
            <ul className="mt-2 divide-y divide-line">
              {due.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                  {r.due ? <RedDot /> : <span className="w-2.5" />}
                  <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{r.title}</b><span className="text-[12.5px] text-ink-2">{r.due ? `due ${r.due}` : "no deadline"}</span></span>
                  {r.action && <Link href={r.action.href} className="inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover">{r.action.label}</Link>}
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[13.5px] text-ink-3">No open availability requests.</p>}
        </section>
        <section className="min-w-0 py-6 md:pl-7">
          {week ? <WeekSchedule start={week.start} rows={week.rows} side="provider" backHref="/find-work" /> : <TodaysInterviews rows={w.todays} side="provider" weekHref="/find-work?view=week" />}
        </section>
      </div>
    </div>
  );
}

export async function JobsInterviews({ personId, userId, view, show, date }: { personId: string; userId: string; view: string | null; show: string | null; date: string | null }) {
  // IW-E003: the provider's twin of the buyer Workday — the hiring company shows; tiles Today · To Confirm · This Week · Tests to Take.
  const { rows, tiles, weekStart } = await interviewGrid("provider", personId, userId);
  const base = "/find-work?tab=interviews";
  if (view === "week") return <div className="mx-auto w-full max-w-6xl py-2"><WorkdayWeek side="provider" rows={rows} weekStart={weekStart} base={base} /></div>;
  const day = gridDay(date);
  const list = show === "confirm" ? rows.filter((r) => r.status === "To Confirm") : rowsOn(rows, day.key);
  return (
    <div className="mx-auto w-full max-w-6xl py-2" data-jobs-interviews>
      <InterviewWorkday side="provider" rows={list} tiles={tiles} show={show === "confirm" ? show : null} base={base} testsHref="/find-work?tab=tests"
        day={{ ...day, label: day.start.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }) }} />
    </div>
  );
}

export async function JobsTests({ personId, slice }: { personId: string; slice?: string }) {
  const all = (await providerTests(personId)).map((t) => ({ ...t, completed: !t.open, recurring: null }));
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <section className="mx-auto w-full max-w-6xl py-2" data-jobs-tests>
      <h1 className="font-display text-[22px] font-bold">Tests</h1>
      <SliceChips tabKey="jobs-tests" counts={sliceCounts(all)} base="/find-work?tab=tests" />
      {rows.length ? (
        <ul className="mt-2 divide-y divide-line border-y border-line text-[13.5px]">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              {t.open ? <RedDot /> : <span className="w-2.5" />}
              <span className="min-w-0 flex-1"><b>{t.skill}</b> · <Link href={`/find-work/${t.jobId}`} className="hover:underline">{t.job}</Link><span className="block text-[12.5px] text-ink-2">sent {t.sent}{t.due ? ` · due ${t.due}` : ""}</span></span>
              <span className="text-ink-2">{t.score != null ? `${t.score}% · ` : ""}<b className="text-ink">{t.result}</b></span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-[13.5px] text-ink-3">No test requests.</p>}
    </section>
  );
}

/** Find Jobs: Best Matches · All Jobs · Saved as filters. */
export function FindJobsFilters({ tab }: { tab: string }) {
  const chips = [["best", "Best Matches"], ["recent", "All Jobs"], ["saved", "Saved"]] as const;
  return (
    <nav aria-label="Find Jobs" className="mx-auto mb-3 flex w-full max-w-6xl flex-wrap gap-2 text-[13px]" data-find-jobs-filters>
      {chips.map(([k, l]) => <Link key={k} href={`/find-work?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={tab === k ? "rounded-full border border-magenta-dark bg-magenta/10 px-3 py-1 font-semibold text-magenta-dark" : "rounded-full border border-line px-3 py-1 font-semibold hover:border-magenta"}>{l}</Link>)}
    </nav>
  );
}
