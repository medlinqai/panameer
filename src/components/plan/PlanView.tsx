/**
 * ── THE PLAN VIEW — PUBLIC ON `/status`, A WORK ORDER IN R2 (`P2-ALL-E785`) ──
 *
 * ⚠⚠ **A SERVER COMPONENT WITH NO CLIENT JAVASCRIPT.** The accordions are
 * `<details>`/`<summary>`, which open and close, take focus and announce
 * themselves with nothing hydrated. ⚠ `/status` is the page a stranger lands on
 * first; making its main content depend on a bundle is the wrong trade.
 *
 * ⚠⚠⚠ **IT RENDERS `PublicPlan` AND NOTHING ELSE.** That type has no
 * `admin_note` and no `hours` field, so this file cannot leak either — the
 * guarantee is in the shape, not in this component remembering.
 */
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";

const HEAD = "font-display font-bold tracking-[-0.3px]";

/** How a status paints. ⚠ One map, so the timeline bar and the accordion badge
 *  cannot drift apart (`E585`). */
/**
 * ── ⚠⚠ LIGHTER, AND MATCHED TO THE BUILD LINE (`P2-ALL-E792`) ───────────────
 *
 * ⚠ **SCOTT, 2026-10-03:** the Gantt is *"a little heavy"*, and *"I like how
 * streamlined and clean the timeline is"* — so this borrows the Build Line's
 * language: `rounded-full` bars on a `bg-line` track, magenta for live work,
 * ink for done, and small dates in `ink-3`.
 * ⚠⚠ **In progress is magenta at 60%**, not full: at full strength four or five
 * live rows made the chart read as a solid magenta block.
 */
const STATUS_BAR: Record<string, string> = {
  Done: "bg-ink",
  "In progress": "bg-magenta/60",
  Blocked: "bg-magenta/25",
  /** ⚠⚠ A DASHED OUTLINE, NOT A FILL. Planned work has not happened, and a
   *  solid bar for it reads as progress. */
  Planned: "border border-dashed border-ink-3",
};

export function PlanView({ plan, today }: { plan: PublicPlan; today: string }) {
  if (plan.rows.length === 0) {
    /** ⚠⚠ At genuine zero, say what is true rather than drawing an empty
     *  chart. A timeline with no rows is not a timeline. */
    return (
      <section className="mt-12 border-t border-line pt-6">
        <h2 className={`text-[24px] text-ink ${HEAD}`}>The plan</h2>
        <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          The plan is being set up. Nothing is published here yet.
        </p>
      </section>
    );
  }

  return (
    <>
      <PlanTimeline plan={plan} today={today} />
      <section className="mt-12 border-t border-line pt-6">
        <h2 className={`text-[24px] text-ink ${HEAD}`}>The plan, phase by phase</h2>
        <div className="mt-5 border-t border-line">
          {plan.rows.map((row) => (
            <PhaseAccordion key={row.id} row={row} />
          ))}
        </div>
      </section>
    </>
  );
}

/* ── the timeline ───────────────────────────────────────────────────────── */

function PlanTimeline({ plan, today }: { plan: PublicPlan; today: string }) {
  const span = plan.span;
  /** ⚠⚠ NO DATES MEANS NOTHING TO DRAW, and the rows below still render. A
   *  chart from epoch to now would be fiction (`E769`'s rule). */
  if (!span) {
    return (
      <section className="mt-10">
        <p className="text-[14px] text-ink-2">
          No dates are set yet, so there is no timeline to show.
        </p>
      </section>
    );
  }

  const from = Date.parse(`${span.start}T00:00:00Z`);
  const to = Date.parse(`${span.end}T00:00:00Z`);
  /** ⚠ A one-day plan would divide by zero; a single day is one day wide. */
  const width = Math.max(to - from, 86_400_000);
  const pct = (iso: string) => ((Date.parse(`${iso}T00:00:00Z`) - from) / width) * 100;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  const ticks = weekTicks(from, to);
  const nowPct = pct(today);
  const todayInRange = nowPct >= 0 && nowPct <= 100;

  /** Desktop shows every row; a phone shows top-level rows only (the design). */
  const flat = plan.rows.flatMap((r) => [r, ...r.children]);

  return (
    <section className="mt-10" aria-label="Plan timeline">
      <div className="relative">
        {/* ── week ticks ─────────────────────────────────────────────── */}
        <div className="relative h-5 border-b border-line">
          {ticks.map((t) => (
            <span
              key={t.iso}
              /* ⚠ A stable hook so the no-overlap rule can be asserted here —
                 it is the same rule `E777` held on the Build Line, on new
                 geometry (ruling 14: the rule outlives the code it named). */
              data-plan-tick
              className="absolute top-0 -translate-x-1/2 font-mono text-[10px] text-ink-3"
              style={{ left: `${clamp(pct(t.iso))}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* ── one line per row ───────────────────────────────────────── */}
        <ul className="relative mt-2">
          {/* ⚠⚠ THE TODAY LINE IS MAGENTA AND SITS ABOVE THE BARS. It is the
              one thing a reader looks for, and it is drawn once for the whole
              chart rather than per row. */}
          {todayInRange && (
            <li
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-magenta"
              style={{ left: `${clamp(nowPct)}%` }}
            />
          )}
          {flat.map((row) => {
            const isChild = !plan.rows.some((r) => r.id === row.id);
            return (
              <li
                key={row.id}
                /** ⚠ ~32px a row (`h-8`), which is what takes the weight out
                 *  without shrinking the type. */
                className={
                  "flex h-8 items-center gap-2 " + (isChild ? "hidden sm:flex" : "")
                }
              >
                <span
                  className={
                    "w-9 shrink-0 text-right font-mono text-[10px] " +
                    /** ⚠⚠ SMALL PLAIN NUMBERS IN GREY — no filled badge here.
                     *  Only the ACCORDION keeps a badge, and only at top level. */
                    (isChild ? "font-normal text-ink-3" : "text-ink-2")
                  }
                >
                  {row.number}
                </span>
                <span className="relative h-8 flex-1">
                  {/* ⚠ The guide is a hairline track, not a dotted rule — the
                      Build Line's `bg-line` bar at 1px. */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-line"
                  />
                  <Bar row={row} pct={pct} clamp={clamp} isChild={isChild} />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        ⚠ SCOTT'S CAPTION, VERBATIM FROM THE BRIEF. It is the whole reason the
        build plan is public: the tool on screen is the tool a buyer gets.
      */}
      <p className="mt-4 text-[13px] text-ink-2">
        The same plan tool you&apos;ll use on your work orders.
      </p>
    </section>
  );
}

function Bar({
  row,
  pct,
  clamp,
  isChild = false,
}: {
  row: PublicPlanRow;
  pct: (iso: string) => number;
  clamp: (n: number) => number;
  isChild?: boolean;
}) {
  if (row.type === "milestone") {
    /** ⚠ A milestone is a point, so it is a diamond, not a bar. An undated one
     *  has no position and is listed in the accordion instead. */
    if (!row.start && !row.end) return null;
    const at = clamp(pct((row.start ?? row.end)!));
    return (
      <span
        title={`${row.title} — ${row.start ?? row.end}`}
        /** ⚠ An OUTLINED diamond, which is exactly `BuildLine`'s flag — a solid
         *  magenta lozenge was the heaviest mark on the chart. */
        className="absolute top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface"
        style={{ left: `${at}%` }}
      />
    );
  }

  if (!row.start || !row.end) {
    /** ⚠⚠ NOT SCHEDULED IS SAID, NOT DRAWN. An unscheduled row must not look
     *  like a row that starts today — a dash with its reason, never a guess. */
    return (
      <span className="absolute top-1/2 left-0 -translate-y-1/2 bg-surface pr-1 font-mono text-[10px] text-ink-3">
        — not scheduled
      </span>
    );
  }

  const left = clamp(pct(row.start));
  const right = clamp(pct(row.end));
  /** ⚠ A same-day row would be 0% wide and invisible; a floor keeps it visible
   *  without making it look longer than it is. */
  const w = Math.max(right - left, 0.8);
  return (
    <span
      title={`${row.title} — ${row.start} to ${row.end} · ${row.status}`}
      /** ⚠ 4px for a task, 6px for a top-level row, both `rounded-full` — the
       *  Build Line's weight and its rounded ends, one line per row. */
      className={
        `absolute top-1/2 block -translate-y-1/2 rounded-full ${isChild ? "h-1" : "h-1.5"} ` +
        (STATUS_BAR[row.status] ?? STATUS_BAR.Planned)
      }
      style={{ left: `${left}%`, width: `${w}%` }}
    />
  );
}

/** Week ticks across the span, thinned so labels never collide. */
function weekTicks(from: number, to: number): { iso: string; label: string }[] {
  const week = 7 * 86_400_000;
  const weeks = Math.max(1, Math.round((to - from) / week));
  /** ⚠ At most ~12 labels: a long plan would otherwise print one per week and
   *  they would overlap into mush. */
  const every = Math.max(1, Math.ceil(weeks / 12));
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i <= weeks; i += every) {
    const d = new Date(from + i * week);
    out.push({
      iso: d.toISOString().slice(0, 10),
      /** ⚠ `timeZone: "UTC"` — these are pure dates and must not shift a day in
       *  America/New_York (`E775`). */
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    });
  }
  return out;
}

/* ── the accordions ─────────────────────────────────────────────────────── */

function PhaseAccordion({ row }: { row: PublicPlanRow }) {
  /** ⚠⚠ THE IN-PROGRESS PHASE IS OPEN BY DEFAULT (the design). Everything else
   *  starts closed so the page can be scanned in seconds. */
  const open = row.status === "In progress";
  return (
    <details open={open} className="border-b border-line">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-3">
        <span
          className={
            /** ⚠⚠ NO FILLED BADGE. A top-level row keeps a 20px OUTLINED badge;
             *  a milestone is the magenta mark; anything else is a plain grey
             *  number (`E792`, Scott: the chart is "a little heavy"). */
            "inline-flex h-5 min-w-5 items-center justify-center px-1 font-mono text-[11px] " +
            (row.type === "milestone"
              ? "text-magenta"
              : "rounded-full border border-line text-ink-2")
          }
        >
          {row.number}
        </span>
        <span className="text-[16px] font-bold text-ink">{row.title || "Untitled"}</span>
        <DateRange row={row} />
        <StatusMark row={row} />
      </summary>

      <div className="pb-4 pl-9">
        {row.note && <p className="max-w-[70ch] text-[14px] leading-relaxed text-ink-2">{row.note}</p>}
        {row.children.length === 0 ? (
          <p className="text-[13px] text-ink-3">
            {row.type === "milestone" ? "A date to hit." : "No tasks listed yet."}
          </p>
        ) : (
          <ul className="mt-1">
            {row.children.map((child) => (
              <li key={child.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line/60 py-2">
                <span className="w-10 shrink-0 font-mono text-[11px] text-ink-3">{child.number}</span>
                <span className="text-[14px] font-normal text-ink-2">{child.title || "Untitled"}</span>
                {child.owner && <span className="text-[12px] text-ink-3">{child.owner}</span>}
                <DateRange row={child} />
                <StatusMark row={child} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function DateRange({ row }: { row: PublicPlanRow }) {
  if (row.type === "milestone" && (row.start || row.end)) {
    return <span className="font-mono text-[12px] text-ink-3">{fmt(row.start ?? row.end!)}</span>;
  }
  /** ⚠⚠ THREE STATES, AND THEY MUST NOT LOOK ALIKE: both dates, a start with no
   *  end, and nothing at all. ⚠ A missing end never prints "Present" — that was
   *  `E549`'s defect, and the rule is the same here. */
  if (row.start && row.end) {
    return <span className="font-mono text-[12px] text-ink-3">{fmt(row.start)} – {fmt(row.end)}</span>;
  }
  if (row.start) return <span className="font-mono text-[12px] text-ink-3">Started {fmt(row.start)}</span>;
  return <span className="font-mono text-[12px] text-ink-3">Not scheduled</span>;
}

function StatusMark({ row }: { row: PublicPlanRow }) {
  /** ⚠⚠ `Late` IS SHOWN BESIDE THE STATUS, NEVER INSTEAD OF IT. It is derived
   *  from the end date, and replacing the status would hide what was set. */
  return (
    <span className="ml-auto flex items-center gap-2">
      {row.late && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-magenta">Past due</span>}
      <span
        className={
          "text-[12px] " + (row.status === "Done" ? "font-bold text-ink" : "text-ink-2")
        }
      >
        {row.status}
      </span>
    </span>
  );
}

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
