import Link from "next/link";
import { BadgeCheck, FilePlus2, FileText, Inbox, Mail, MessagesSquare, Reply, Send, UserCheck, Users, type LucideIcon } from "lucide-react";
import type { StripStep, JobTab } from "@/lib/job-strip";

// OJ-E001: one header strip and one tab row on every tab of the Job page (Scott's hire_flow_2026-10-22 screens A/B).
// Scott 10-23: the Job Timeline — a bigger title, an icon per step, two-word names, centred; reached steps open their tab.
const STEP_TAB: Record<string, JobTab> = { create: "details", matches: "matches", ask: "responses", interview: "interviews", hire: "work-order" };
const STEP_ICON: Record<string, LucideIcon> = { create: FilePlus2, matches: Users, ask: Inbox, interview: MessagesSquare, hire: UserCheck, approve: BadgeCheck, wo: FileText, release: Send };
// The provider's strip reuses the keys with its own labels — pick its icons by label.
const LABEL_ICON: Record<string, LucideIcon> = { Asked: Mail, Answered: Reply, "Interview & Questions": MessagesSquare, Decision: UserCheck, Order: FileText };
export function JobStrip({ steps, jobId, title }: { steps: StripStep[]; jobId?: string; title?: string }) {
  return (
    <div className="overflow-x-auto" data-job-strip>
      {title && <h2 className="mb-5 text-[22px] font-extrabold">{title}</h2>}
      <ol className="grid min-w-[760px] gap-x-2 text-center" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, n) => {
          const Icon = LABEL_ICON[s.label] ?? STEP_ICON[s.key] ?? FileText;
          const ring = s.state === "done" ? "border-ink bg-ink text-surface" : s.state === "current" ? "border-magenta bg-white text-magenta-dark" : "border-state-border bg-white text-state-disabled";
          // Scott 10-23: stack the words — "1. Create" over "Job".
          const [first, ...rest] = s.label.split(" ");
          const name = <>{`${n + 1}. ${first}`}{rest.length ? <><br />{rest.join(" ")}</> : null}</>;
          const label = jobId && (s.state === "done" || s.state === "current")
            ? <Link href={`/work-requests/${jobId}?tab=${STEP_TAB[s.key]}`} scroll={false} className={`no-underline hover:underline ${s.state === "current" ? "text-magenta-dark" : "text-ink"}`}>{name}</Link>
            : <span className={s.state === "current" ? "text-magenta-dark" : s.state === "skipped" ? "text-state-inactive" : s.state === "later" ? "text-state-disabled" : "text-ink"}>{name}</span>;
          return (
            <li key={s.key} className="flex flex-col items-center gap-2.5" data-strip-step={s.key} data-strip-state={s.state} aria-current={s.state === "current" ? "step" : undefined}>
              <span className={`grid h-11 w-11 place-items-center rounded-full border-2 ${ring}`} aria-hidden><Icon size={20} strokeWidth={1.9} /></span>
              <span className="min-h-[34px] text-[13px] font-semibold leading-[1.3]">{label}</span>
              <i className={`block h-1.5 w-full rounded-sm ${s.state === "done" ? "bg-ink" : s.state === "current" ? "bg-magenta" : "bg-state-sunken"}`} />
              <span className="flex min-h-[34px] flex-col items-center leading-tight">
                {s.note ? <b className={`text-[12px] ${s.state === "current" ? "text-magenta-dark" : "text-ink"}`} data-step-note>{s.note}</b> : null}
                <span className={`text-[11.5px] font-semibold ${s.state === "done" ? "text-state-accepted" : s.state === "current" ? "text-magenta-dark" : "text-state-inactive"}`}>{s.top || (s.note ? "" : "\u00a0")}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function JobTabs({ jobId, current, counts }: { jobId: string; current: JobTab; counts: Partial<Record<JobTab, number>> }) {
  // Scott 10-23: one tab per Timeline step, numbered the same, so progress and sequence read together.
  const tabs: [JobTab, string][] = [["details", "1. Create Job"], ["matches", "2. Choose Provider"], ["responses", "3. Collect Responses"], ["interviews", "4. Interview & Ask"], ["work-order", "5. Hire Provider"]];
  return (
    <nav aria-label="Job" className="flex gap-6 overflow-x-auto border-b border-state-border" data-job-tabs>
      {tabs.map(([k, label]) => {
        const on = k === current;
        return (
          <Link key={k} href={`/work-requests/${jobId}?tab=${k}`} aria-current={on ? "page" : undefined} scroll={false}
            className={on ? "shrink-0 border-b-[3px] border-magenta pb-2.5 pt-2 text-[14px] font-semibold text-magenta-dark no-underline" : "shrink-0 pb-3 pt-2 text-[14px] font-semibold text-ink no-underline hover:text-magenta-dark"}>
            {label}{counts[k] ? <span className="ml-1.5 inline-grid h-[20px] min-w-[20px] place-items-center rounded-full bg-ink px-1.5 align-[1px] text-[11px] font-bold text-surface" data-tab-count>{counts[k]}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
