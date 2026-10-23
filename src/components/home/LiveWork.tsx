import Link from "next/link";
import type { ReactNode } from "react";
import type { StripStep, Tile, WorkRow } from "@/lib/live-work";
import type { InterviewRow } from "@/lib/interviews";
import { NeutralAvatar } from "@/components/Avatar";
import { INTERVIEW_GUIDELINES } from "@/lib/interview-guidelines";

// DB-E002–E005: the dashboard's live work — white page, light cards, magenta for current; folds on mobile.
const TZ = "America/New_York";
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

export function Card({ id, title, right, children, open = true }: { id?: string; title: ReactNode; right?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="group mt-4 rounded-[12px] border border-line bg-white [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <span className="text-[15px] font-extrabold">{title}</span>
        <span className="flex items-center gap-3 text-[13px]">{right}<span aria-hidden className="text-ink-3 transition-transform group-open:rotate-180">▾</span></span>
      </summary>
      <div className="border-t border-line px-4 py-3 sm:px-5">{children}</div>
    </details>
  );
}

export function AttentionTiles({ tiles }: { tiles: Tile[] }) {
  if (!tiles.length) return null;
  return (
    <section aria-label="Needs your attention" className="mt-4" data-attention-tiles>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Needs Your Attention</h2>
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.id} href={t.href} data-tile={t.id} className="flex min-w-0 flex-col rounded-[12px] border border-line bg-white p-3.5 hover:border-magenta">
            <b className="text-[26px] leading-none text-magenta-dark tabular-nums">{t.count}</b>
            <span className="mt-1.5 text-[13px] font-semibold leading-snug">{t.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function InterviewLine({ r, side }: { r: InterviewRow; side: "buyer" | "provider" }) {
  const msgUser = side === "buyer" ? r.providerUserId : r.buyerUserId;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3" data-todays-interview>
      <b className="w-[72px] shrink-0 text-[14px] tabular-nums">{r.startsAt ? time(r.startsAt) : "—"}</b>
      {side === "buyer" ? <NeutralAvatar size={36} /> : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold">{side === "buyer" ? r.providerLabel : r.buyerCompany}</p>
        <p className="truncate text-[12.5px] text-ink-2"><Link href={side === "buyer" ? `/work-requests/${r.jobId}` : `/find-work/${r.jobId}`} className="hover:underline">{r.jobTitle}</Link></p>
        {r.skills.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1 text-[11px]">
            {r.skills.slice(0, 4).map((s) => <Link key={s.id} href={`/search?q=${encodeURIComponent(s.name)}`} className="rounded-full border border-line px-2 hover:border-magenta" title={s.name}>◆ {s.name}</Link>)}
          </p>
        )}
      </div>
      <span className="flex shrink-0 gap-2">
        {msgUser && <Link href={`/messages?with=${msgUser}`} className="inline-flex min-h-9 items-center border border-ink px-3 text-[13px] font-semibold hover:bg-bg-soft">Message</Link>}
        {r.hasRoom ? <a href={`/api/interviews/${r.id}/join`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover">Join</a> : <span className="inline-flex min-h-9 items-center text-[12px] text-ink-3">Video link not set up yet</span>}
      </span>
    </li>
  );
}

export function TodaysInterviews({ rows, side, weekHref }: { rows: InterviewRow[]; side: "buyer" | "provider"; weekHref: string }) {
  return (
    <Card id="todays-interviews" title={`Today's Interviews (${rows.length})`} right={<Link href={weekHref} className="font-semibold text-magenta-dark underline underline-offset-4">View Week</Link>}>
      {rows.length ? <ul className="divide-y divide-line">{rows.map((r) => <InterviewLine key={r.id} r={r} side={side} />)}</ul> : <p className="text-[13.5px] text-ink-3">No interviews today.</p>}
      <p className="mt-2 text-[11.5px] leading-snug text-ink-3"><b>Interview guidelines:</b> {INTERVIEW_GUIDELINES}</p>
    </Card>
  );
}

/** DB-E003: the weekly schedule — Mon–Sun columns on desktop, a day list on mobile. */
export function WeekSchedule({ start, rows, side, backHref }: { start: Date; rows: InterviewRow[]; side: "buyer" | "provider"; backHref: string }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
  return (
    <Card id="week" title="This Week's Interviews" right={<Link href={backHref} className="font-semibold text-magenta-dark underline underline-offset-4">Today</Link>}>
      <div className="grid gap-2 md:grid-cols-7" data-week-schedule>
        {days.map((d) => {
          const list = rows.filter((r) => r.startsAt && key(new Date(r.startsAt)) === key(d));
          return (
            <div key={d.toISOString()} className="min-w-0 rounded-[8px] border border-line p-2">
              <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">{d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" })}</p>
              {list.length ? list.map((r) => (
                <Link key={r.id} href={side === "buyer" ? `/work-requests/${r.jobId}?tab=interviews` : `/find-work/${r.jobId}#interview`} className="mt-1.5 block rounded-[6px] bg-[#fbeafb] px-2 py-1 text-[12px] hover:underline">
                  <b>{r.startsAt ? time(r.startsAt) : ""}</b> {side === "buyer" ? r.providerLabel : r.buyerCompany}
                </Link>
              )) : <p className="mt-1 text-[12px] text-ink-3">—</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function ProcessStrip({ steps, active, base }: { steps: StripStep[]; active: string | null; base: string }) {
  return (
    <div className="-mx-1 overflow-x-auto pb-1" data-process-strip>
      <ol className="flex min-w-max gap-1 px-1">
        {steps.map((s, i) => {
          const on = s.key === active;
          return (
            <li key={s.key} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-0.5 h-0.5 w-3 bg-[#C9CDDC]" />}
              <Link href={on ? `${base}#live-work` : `${base}?step=${s.key}#live-work`} aria-current={on ? "step" : undefined} data-strip-step={s.key}
                className={on ? "flex w-[92px] flex-col items-center rounded-[10px] border-2 border-magenta bg-[#fbeafb] px-1.5 py-2 text-center" : "flex w-[92px] flex-col items-center rounded-[10px] border border-line bg-white px-1.5 py-2 text-center hover:border-magenta"}>
                <b className={s.count ? "text-[20px] leading-none text-ink tabular-nums" : "text-[20px] leading-none text-[#C9CDDC] tabular-nums"}>{s.count}</b>
                <span className="mt-1 text-[11.5px] font-semibold leading-tight">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RowItem({ r, label }: { r: WorkRow; label: string }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5" data-live-row={r.step}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{r.title}</p>
        <p className="text-[12.5px] text-ink-2">
          {[r.ref, r.who, label, r.posted ? `posted ${new Date(r.posted).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" })}` : null, `${r.days} day${r.days === 1 ? "" : "s"} at this step`, r.due ? `due ${r.due}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {r.action && <Link href={r.action.href} className="inline-flex min-h-9 shrink-0 items-center bg-ink px-3.5 text-[13px] font-bold text-surface hover:bg-ink-hover">{r.action.label}</Link>}
    </li>
  );
}

export function LiveWorkList({ title, steps, rows, active, base, footer }: { title: string; steps: StripStep[]; rows: WorkRow[]; active: string | null; base: string; footer?: ReactNode }) {
  const label = (k: string) => steps.find((s) => s.key === k)?.label ?? k;
  const list = active ? rows.filter((r) => r.step === active) : rows;
  const recent = list.filter((r) => !r.old);
  const older = list.filter((r) => r.old);
  return (
    <Card id="live-work" title={title} right={active ? <Link href={`${base}#live-work`} className="font-semibold text-magenta-dark underline underline-offset-4">Show All</Link> : null}>
      <ProcessStrip steps={steps} active={active} base={base} />
      {list.length ? (
        <>
          <ul className="mt-2 divide-y divide-line">{recent.map((r) => <RowItem key={r.id} r={r} label={label(r.step)} />)}</ul>
          {older.length > 0 && (
            <details className="mt-2 border-t border-line pt-2" data-older-jobs>
              <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">Older than 5 days ({older.length})</summary>
              <ul className="divide-y divide-line">{older.map((r) => <RowItem key={r.id} r={r} label={label(r.step)} />)}</ul>
            </details>
          )}
        </>
      ) : <p className="mt-2 text-[13.5px] text-ink-3">{active ? "Nothing at this step." : "Nothing in progress."}</p>}
      {footer && <p className="mt-3 border-t border-line pt-2 text-[12px] text-ink-3">{footer}</p>}
    </Card>
  );
}

/** DB-E002–E004: the buyer's live work (null when there is nothing in flight). */
export async function BuyerLiveWork({ personId, step, view }: { personId: string; step: string | null; view: string | null }) {
  const { buyerLiveWork, weekInterviews } = await import("@/lib/live-work");
  const w = await buyerLiveWork(personId);
  if (!w.tiles.length && !w.rows.length && !w.todays.length) return null;
  const week = view === "week" ? await weekInterviews("buyer", personId) : null;
  return (
    <div data-buyer-live-work>
      <AttentionTiles tiles={w.tiles} />
      {week ? <WeekSchedule start={week.start} rows={week.rows} side="buyer" backHref="/dashboard#todays-interviews" /> : <TodaysInterviews rows={w.todays} side="buyer" weekHref="/dashboard?view=week#week" />}
      <LiveWorkList title="Request Path" steps={w.strip} rows={w.rows} active={step} base="/dashboard" footer={<>{w.footer.openJobs} open Job{w.footer.openJobs === 1 ? "" : "s"} · {w.footer.monthOrders} Order{w.footer.monthOrders === 1 ? "" : "s"} this month</>} />
    </div>
  );
}

/** DB-E005: the provider twin. */
export async function ProviderLiveWork({ personId, step, view }: { personId: string; step: string | null; view: string | null }) {
  const { providerLiveWork, weekInterviews } = await import("@/lib/live-work");
  const w = await providerLiveWork(personId);
  const week = view === "week" ? await weekInterviews("provider", personId) : null;
  return (
    <div data-provider-live-work>
      <AttentionTiles tiles={w.tiles} />
      {week ? <WeekSchedule start={week.start} rows={week.rows} side="provider" backHref="/dashboard#todays-interviews" /> : <TodaysInterviews rows={w.todays} side="provider" weekHref="/dashboard?view=week#week" />}
      <LiveWorkList title="Your Responses" steps={w.strip} rows={w.rows} active={step} base="/dashboard" />
    </div>
  );
}
