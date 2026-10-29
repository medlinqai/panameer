import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, FlaskConical, MessageSquare, NotebookPen } from "lucide-react";
import { NeutralAvatar } from "@/components/Avatar";
import { BTN_MAGENTA, BTN_OUT, StatePill, type UiState } from "@/components/hire/HireUI";
import type { GridRow, GridSide, GridStatus, GridTiles } from "@/lib/interview-grid";

// IW-E001/E003: the Interviews "Workday" (Medlinq ScheduleGrid pattern) — one column template shared by the header and
// every row, indicator icons always present (greyed when there's nothing), each cell its own click target.
const COLS: Record<GridSide, string> = {
  buyer: "64px 12px 36px minmax(180px,1fr) 104px 30px 30px 30px 72px 88px",
  provider: "64px 12px minmax(200px,1fr) 104px 30px 30px 88px",
};
const GREY = "var(--color-state-border)";
const DOT: Record<GridStatus, string> = { Scheduled: "bg-state-accepted", "To Confirm": "bg-state-pending", Done: "bg-state-inactive", Declined: "bg-state-declined" };
const PILL: Record<GridStatus, UiState> = { Scheduled: "accepted", "To Confirm": "pending", Done: "inactive", Declined: "declined" };
const TEST: Record<GridRow["test"], { color: string; label: string }> = {
  none: { color: GREY, label: "No test requested" }, pending: { color: "var(--color-state-pending)", label: "Test pending" },
  passed: { color: "var(--color-state-accepted)", label: "Test passed" }, failed: { color: "var(--color-state-declined)", label: "Test failed" },
};

export type WorkdayDay = { key: string; prev: string; next: string; isToday: boolean; label: string };

export function InterviewWorkday({ side, rows, tiles, day, base, show, testsHref, top, actions, bottom }: { side: GridSide; rows: GridRow[]; tiles: GridTiles; day: WorkdayDay; base: string; show: string | null; testsHref: string; top?: ReactNode; actions?: ReactNode; bottom?: ReactNode }) {
  const href = (q: string) => `${base}${q ? `&${q}` : ""}`;
  const tileList: [string, number, string, boolean][] = [
    ["Today", tiles.today, href(""), !show],
    ["To Confirm", tiles.toConfirm, href("show=confirm"), show === "confirm"],
    ["This Week", tiles.week, href("view=week"), false],
    ...(side === "buyer" ? ([["Feedback Due", tiles.feedback, href("show=feedback"), show === "feedback"]] as [string, number, string, boolean][]) : []),
    [side === "buyer" ? "Tests Pending" : "Tests to Take", tiles.tests, testsHref, false],
  ];
  const title = show === "confirm" ? "To Confirm" : show === "feedback" ? "Feedback Due" : null;
  return (
    <div className="flex flex-col gap-6" data-interview-workday={side}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-extrabold">Interviews</h1>
          <p className="mt-1 text-[14px] text-state-inactive">
            You have <Link href={href("")} className="font-semibold">{tiles.today} interview{tiles.today === 1 ? "" : "s"} today</Link> and <Link href={href("show=confirm")} className="font-semibold">{tiles.toConfirm} to confirm</Link>.
          </p>
        </div>
        {actions}
      </div>
      {top}
      <div className={`grid grid-cols-2 gap-3 ${side === "buyer" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`} data-workday-tiles>
        {tileList.map(([label, n, h, on]) => (
          <Link key={label} href={h} aria-current={on ? "page" : undefined} className={on ? "rounded-[12px] border-2 border-magenta bg-white px-4 py-3.5 no-underline" : "rounded-[12px] border border-state-border bg-white px-4 py-3.5 text-ink no-underline hover:border-magenta"} data-workday-tile={label}>
            <div className={`text-[26px] font-extrabold leading-none ${n ? "text-ink" : "text-state-border"}`}>{n}</div>
            <div className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-state-inactive">{label}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-[12px] border border-state-border bg-white" data-workday-schedule>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-state-border px-5 py-3.5">
          {title ? <h2 className="text-[16px] font-extrabold">{title}</h2> : (
            <div className="flex items-center gap-2" data-day-nav>
              <Link href={href(`date=${day.prev}`)} aria-label="Previous day" className={`${BTN_OUT} min-h-9 px-2.5`}>‹</Link>
              <span className="min-w-[150px] text-center text-[15px] font-extrabold">{day.isToday ? "Today" : day.label}</span>
              <Link href={href(`date=${day.next}`)} aria-label="Next day" className={`${BTN_OUT} min-h-9 px-2.5`}>›</Link>
              {!day.isToday && <Link href={href("")} className="ml-1 text-[13px] font-semibold">Today</Link>}
            </div>
          )}
          <Link href={href("view=week")} className="text-[13px] font-semibold">View Week</Link>
        </div>
        {rows.length ? <Grid side={side} rows={rows} /> : (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center" data-workday-empty>
            <CalendarDays size={28} strokeWidth={1.6} className="text-state-border" />
            <p className="text-[14px] font-semibold">{title ? "Nothing here" : "No interviews on this day"}</p>
            <Link href={href("view=week")} className="text-[13px] font-semibold">View Week →</Link>
          </div>
        )}
      </section>
      {bottom}
    </div>
  );
}

function H({ children, center = false, right = false }: { children?: ReactNode; center?: boolean; right?: boolean }) {
  return <div className={`text-[10.5px] font-bold uppercase tracking-[0.08em] text-state-inactive ${center ? "text-center" : right ? "text-right" : ""}`}>{children}</div>;
}

function Grid({ side, rows }: { side: GridSide; rows: GridRow[] }) {
  const cols = COLS[side];
  const open = (r: GridRow) => (side === "buyer" ? `/work-requests/${r.jobId}?tab=interviews` : `/work/jobs/${r.jobId}#interview`);
  const job = (r: GridRow) => (side === "buyer" ? `/work-requests/${r.jobId}` : `/work/jobs/${r.jobId}`);
  return (
    <div className="overflow-x-auto">
      <div className={side === "buyer" ? "min-w-[820px]" : "min-w-[620px]"}>
        <div className="grid items-center gap-2 border-b border-state-border px-5 py-2" style={{ gridTemplateColumns: cols }}>
          <H>Time</H><H />{side === "buyer" && <H />}
          <H>{side === "buyer" ? "Provider No. · Job" : "Company · Job"}</H>
          <H>Status</H><H center>Test</H>{side === "buyer" && <H center>Notes</H>}<H center>Msgs</H>
          {side === "buyer" && <H right>Rate</H>}<H right />
        </div>
        <div className="divide-y divide-state-sunken">
          {rows.map((r) => (
            <div key={r.id} className="grid items-center gap-2 px-5 py-3 hover:bg-bg-soft" style={{ gridTemplateColumns: cols }} data-workday-row={r.status}>
              <Link href={open(r)} className="text-[14px] font-bold tabular-nums text-ink hover:underline" title="Open Interview">{r.time}</Link>
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[r.status]}`} title={r.status} />
              {side === "buyer" && <NeutralAvatar size={32} photoUrl={r.photoUrl} />}
              <div className="min-w-0">
                <Link href={open(r)} className="block truncate text-[14px] font-bold text-ink hover:underline">{[r.who, r.role].filter(Boolean).join(" · ")}</Link>
                <Link href={job(r)} className="block truncate text-[12.5px] text-state-inactive hover:underline">{r.jobTitle}</Link>
              </div>
              <Link href={open(r)} className="min-w-0"><StatePill state={PILL[r.status]}>{r.status}</StatePill></Link>
              <span className="flex justify-center" title={TEST[r.test].label}><FlaskConical size={17} strokeWidth={1.8} style={{ color: TEST[r.test].color }} /></span>
              {side === "buyer" && (
                <Link href={open(r)} className="flex justify-center" title={r.ranked ? "Ranked — see notes" : "Not ranked yet"}>
                  <NotebookPen size={17} strokeWidth={1.8} className={r.ranked ? "text-ink" : ""} style={r.ranked ? undefined : { color: GREY }} />
                </Link>
              )}
              {r.messagesHref ? (
                <Link href={r.messagesHref} className="flex justify-center" title={r.unread ? "Unread messages" : "Messages"}><MessageSquare size={17} strokeWidth={1.8} style={{ color: r.unread ? "var(--color-state-declined)" : GREY }} /></Link>
              ) : <span className="flex justify-center"><MessageSquare size={17} strokeWidth={1.8} style={{ color: GREY }} /></span>}
              {side === "buyer" && <span className="text-right text-[13px] font-semibold tabular-nums">{r.rate ?? <span className="text-state-border">—</span>}</span>}
              <span className="flex justify-end">
                {r.live && r.hasRoom ? <a href={`/api/interviews/${r.id}/join`} target="_blank" rel="noreferrer" className={`${BTN_MAGENTA} min-h-9`} data-workday-join>Join</a>
                  : r.ended && r.status === "Done" && side === "buyer" ? <Link href={open(r)} className={`${BTN_OUT} min-h-9`} data-workday-rank>{r.ranked ? "Ranked" : "Rank"}</Link>
                  : <span className="text-[12px] text-state-border">—</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** IW-E002: the week — Mon–Fri (Sat/Sun only when booked), today highlighted; solid magenta edge = confirmed, dashed = to confirm. */
export function WorkdayWeek({ side, rows, weekStart, base }: { side: GridSide; rows: GridRow[]; weekStart: Date; base: string }) {
  const TZ = "America/New_York";
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  const today = key(new Date());
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + (i + 0.5) * 86_400_000))
    .map((d) => ({ d, k: key(d), list: rows.filter((r) => r.startsAt && key(new Date(r.startsAt)) === key(d) && r.status !== "Declined").sort((a, b) => a.startsAt!.localeCompare(b.startsAt!)) }))
    .filter((x, i) => i < 5 || x.list.length > 0);
  const open = (r: GridRow) => (side === "buyer" ? `/work-requests/${r.jobId}?tab=interviews` : `/work/jobs/${r.jobId}#interview`);
  return (
    <section className="flex flex-col gap-4" data-workday-week>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[30px] font-extrabold">This Week</h1>
        <Link href={base} className="text-[13px] font-semibold">← Today</Link>
      </div>
      <div className={`grid gap-3 ${days.length > 5 ? (days.length > 6 ? "md:grid-cols-7" : "md:grid-cols-6") : "md:grid-cols-5"}`}>
        {days.map(({ d, k, list }) => (
          <div key={k} className={k === today ? "min-w-0 rounded-[12px] border-2 border-magenta bg-white p-3" : "min-w-0 rounded-[12px] border border-state-border bg-white p-3"} data-week-day={k}>
            <Link href={`${base}&date=${k}`} className={`block text-[12px] font-extrabold uppercase tracking-[0.08em] no-underline ${k === today ? "text-magenta" : "text-ink"}`}>
              {d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" })}
            </Link>
            {list.length ? list.map((r) => (
              <Link key={r.id} href={open(r)} className={r.status === "To Confirm" ? "mt-2 block border-l-[3px] border-dashed border-magenta bg-bg-soft px-2 py-1.5 text-[12.5px] text-ink no-underline hover:underline" : "mt-2 block border-l-[3px] border-solid border-magenta bg-bg-soft px-2 py-1.5 text-[12.5px] text-ink no-underline hover:underline"} data-week-block={r.status}>
                <b className="tabular-nums">{r.time}</b> · {r.who}
                <span className="block truncate text-state-inactive">{r.jobTitle}</span>
              </Link>
            )) : <p className="mt-2 text-[12.5px] text-state-border">—</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
