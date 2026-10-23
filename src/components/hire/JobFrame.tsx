import Link from "next/link";
import type { StripStep, JobTab } from "@/lib/job-strip";

// OJ-E001: one header strip and one tab row on every tab of the Job page (Scott's hire_flow_2026-10-22 screens A/B).
// Scott 10-23: each reached step opens the tab holding its data.
const STEP_TAB: Record<string, JobTab> = { create: "details", matches: "matches", ask: "responses", interview: "interviews", hire: "work-order", approve: "work-order", wo: "work-order", release: "work-order" };
export function JobStrip({ steps, jobId, title }: { steps: StripStep[]; jobId?: string; title?: string }) {
  return (
    <div className="overflow-x-auto" data-job-strip>
      {title && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">{title}</p>}
      <ol className="grid min-w-[640px] gap-1 text-center" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s) => (
          <li key={s.key} className="flex flex-col items-center gap-1.5" data-strip-step={s.key} data-strip-state={s.state} aria-current={s.state === "current" ? "step" : undefined}>
            <b className={`min-h-[16px] text-[11px] ${s.state === "done" ? "text-state-accepted" : s.state === "current" ? "text-magenta-dark" : "text-state-inactive"}`}>{s.top || " "}</b>
            <i className={`block h-1 w-full rounded-sm ${s.state === "done" ? "bg-ink" : s.state === "current" ? "bg-magenta" : "bg-state-sunken"}`} />
            {jobId && (s.state === "done" || s.state === "current")
              ? <Link href={`/work-requests/${jobId}?tab=${STEP_TAB[s.key]}`} scroll={false} className={`text-[12px] font-semibold no-underline hover:underline ${s.state === "current" ? "text-magenta-dark" : "text-ink"}`}>{s.label}</Link>
              : <span className={`text-[12px] font-semibold ${s.state === "current" ? "text-magenta-dark" : s.state === "skipped" ? "text-state-inactive" : s.state === "later" ? "text-state-disabled" : "text-ink"}`}>{s.label}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function JobTabs({ jobId, current, counts }: { jobId: string; current: JobTab; counts: Partial<Record<JobTab, number>> }) {
  const tabs: [JobTab, string][] = [["matches", "Matches"], ["responses", "Responses"], ["interviews", "Interviews"], ["tests", "Tests"], ["work-order", "Order"], ["details", "Details"]];
  return (
    <nav aria-label="Job" className="flex gap-6 overflow-x-auto border-b border-state-border" data-job-tabs>
      {tabs.map(([k, label]) => {
        const on = k === current;
        return (
          <Link key={k} href={`/work-requests/${jobId}?tab=${k}`} aria-current={on ? "page" : undefined} scroll={false}
            className={on ? "shrink-0 border-b-[3px] border-magenta pb-2.5 pt-2 text-[14px] font-semibold text-magenta-dark no-underline" : "shrink-0 pb-3 pt-2 text-[14px] font-semibold text-ink no-underline hover:text-magenta-dark"}>
            {label}{counts[k] ? <span className="ml-1 text-[11.5px] text-state-inactive">{counts[k]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
