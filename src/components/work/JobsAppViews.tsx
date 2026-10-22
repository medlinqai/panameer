import Link from "next/link";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { providerLiveWork, providerTests, weekInterviews } from "@/lib/live-work";
import { listInterviews } from "@/lib/interviews";
import { dailyConfigured } from "@/lib/daily";
import { TodaysInterviews, WeekSchedule } from "@/components/home/LiveWork";
import { InterviewCards } from "@/components/work/InterviewCards";
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
          { value: stat("accept"), label: "WORK ORDERS TO ACCEPT" },
        ]}
        actions={<><Link href="/find-work?tab=best" className={HERO_BTN}>Find Jobs</Link><Link href="/find-work?tab=proposals" className={HERO_BTN_W}>My Proposals</Link></>}
      />
      <div className="grid md:grid-cols-2">
        <section className="min-w-0 py-6 md:border-r md:border-line md:pr-7" data-requests-due>
          <h2 className="text-[22px] font-bold">Proposal Requests</h2>
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
          ) : <p className="mt-2 text-[13.5px] text-ink-3">No open requests to propose.</p>}
        </section>
        <section className="min-w-0 py-6 md:pl-7">
          {week ? <WeekSchedule start={week.start} rows={week.rows} side="provider" backHref="/find-work" /> : <TodaysInterviews rows={w.todays} side="provider" weekHref="/find-work?view=week" />}
        </section>
      </div>
    </div>
  );
}

export async function JobsInterviews({ personId, view, slice }: { personId: string; view: string | null; slice?: string }) {
  if (view === "week") {
    const week = await weekInterviews("provider", personId);
    return <div className="mx-auto w-full max-w-6xl"><WeekSchedule start={week.start} rows={week.rows} side="provider" backHref="/find-work?tab=interviews" /></div>;
  }
  const all = (await listInterviews({ providerPersonId: personId })).map((r) => ({ ...r, completed: !["REQUESTED", "SLOTS_OFFERED", "SCHEDULED"].includes(r.status), recurring: null }));
  const rows = all.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <section className="mx-auto w-full max-w-6xl py-2" data-jobs-interviews>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-[22px] font-bold">Interviews</h1>
        <Link href="/find-work?tab=interviews&view=week" className="text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">View Week</Link>
      </div>
      <div className="mt-3"><SliceChips tabKey="jobs-interviews" counts={sliceCounts(all)} base="/find-work?tab=interviews" />{rows.length ? <InterviewCards rows={rows} side="provider" videoReady={dailyConfigured()} /> : <p className="text-[13.5px] text-ink-3">No interviews right now.</p>}</div>
    </section>
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
      {chips.map(([k, l]) => <Link key={k} href={`/find-work?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={tab === k ? "rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "rounded-full border border-line px-3 py-1 font-semibold hover:border-magenta"}>{l}</Link>)}
    </nav>
  );
}
