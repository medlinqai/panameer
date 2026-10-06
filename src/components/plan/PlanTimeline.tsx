"use client";

import { useRef, useState } from "react";
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";

const STATUS_BAR: Record<string, string> = {
  Done: "bg-ink",
  "In progress": "bg-magenta/60",
  Blocked: "bg-magenta/25",
  Planned: "border border-dashed border-ink-3",
};

const DAY = 86_400_000;
const ms = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
/** Pure dates print in UTC or they shift a day in America/New_York (`E775`). */
const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** "3 Build · Sep 20 – Nov 9 · In progress" — Scott's format, one definition. */
export function barLabel(row: {
  number: string;
  mark: string;
  title: string;
  start: string | null;
  end: string | null;
  status: string;
  type: string;
}): string {
  /* `mark`, not `number`: the row's number column prints ◆ for a milestone,
     and a tooltip that said "5" while the row said "◆" is the off-by-one
     Scott reported in another form (`E819`). */
  const name = `${row.mark} ${row.title || "Untitled"}`;
  if (row.type === "milestone") {
    const at = row.start ?? row.end;
    return at ? `${name} · ${fmt(at)}` : `${name} · no date`;
  }
  if (row.start && row.end) return `${name} · ${fmt(row.start)} – ${fmt(row.end)} · ${row.status}`;
  if (row.start) return `${name} · from ${fmt(row.start)}, no end date · ${row.status}`;
  return `${name} · not scheduled · ${row.status}`;
}

export function PlanTimeline({ plan, today, footnote = true }: { plan: PublicPlan; today: string; footnote?: boolean }) {
  /** The AXIS row is the track: it already carries `marginLeft: var(--plan-label)` */
  const axisRef = useRef<HTMLDivElement>(null);
  /** Scrubber position as a % of the track, or null when not scrubbing. */
  const [scrub, setScrub] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  /** Folded releases. Collapsed state is per visit; nothing persists. */
  const [shut, setShut] = useState<ReadonlySet<string>>(new Set());

  const span = plan.span;
  if (!span) {
    return (
      <section className="mt-10">
        <p className="text-[14px] text-ink-2">No dates are set yet, so there is no timeline to show.</p>
      </section>
    );
  }

  const from = ms(span.start);
  const to = ms(span.end);
  const width = Math.max(to - from, DAY);
  const pct = (iso: string) => ((ms(iso) - from) / width) * 100;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const nowPct = pct(today);
  const todayInRange = nowPct >= 0 && nowPct <= 100;
  const ticks = weekTicks(from, to);

  /** The date under a given % of the track. */
  const dateAt = (p: number) =>
    new Date(from + (p / 100) * width).toISOString().slice(0, 10);

  const move = (clientX: number) => {
    const el = axisRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* Left of the track (over the labels) reads as no scrub rather than as day
       zero — a line pinned at the start would be a wrong date, not no date. */
    const p = ((clientX - r.left) / r.width) * 100;
    setScrub(p < 0 || p > 100 ? null : p);
  };

  /** RELEASES, AND THE STAGES UNDER THEM WHEN OPEN ( , the mockup). */
  const lines: { row: PublicPlanRow; band: boolean }[] = [];
  for (const top of plan.rows) {
    lines.push({ row: top, band: top.type === "release" });
    if (top.type === "release" && !shut.has(top.id)) {
      for (const stage of top.children) lines.push({ row: stage, band: false });
    }
  }

  return (
    <section className="mt-10" aria-label="Plan timeline">
      {/* takes its width from it and the axis, scrubber and today line take their */}
      <div
        data-plan-scrubarea
        className="relative touch-none [--plan-label:150px] sm:[--plan-label:260px]"
        onPointerMove={(e) => move(e.clientX)}
        onPointerDown={(e) => {
          setDragging(true);
          move(e.clientX);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => {
          /* A drag keeps the line while the pointer is down — leaving the chart
             mid-drag should not drop the date you were dragging to. Hover
             clears on leave. */
          if (!dragging) setScrub(null);
        }}
      >
        <div
          ref={axisRef}
          className="relative h-5 border-b border-line"
          style={{ marginLeft: "var(--plan-label)" }}
        >
          {/* A tick within a few percent of the right edge has its centred
              label clipped by the container, so it is dropped rather than
              printed half-visible. */}
          {ticks.filter((t) => clamp(pct(t.iso)) <= 96).map((t, i) => (
            <span
              key={t.iso}
              data-plan-tick={t.iso}
              className={
                "absolute top-0 -translate-x-1/2 font-mono text-[10px] text-ink-3 " +
                /* Every third label on a phone: the track is ~230px there and
                   twelve labels collide (`E798`). CSS, not measurement, so the
                   server and the client render the same count. */
                // PHONE THINNING IS ADAPTIVE . `weekTicks` already thins
                (ticks.length > 6 && i % 2 !== 0 ? "hidden sm:inline" : "")
              }
              style={{ left: `${clamp(pct(t.iso))}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* THE ROWS. One list, so a label and its bar are the same element — they */}
        <ul className="relative mt-2">
          {/* THE SCRUBBER's marks. `pointer-events-none` so a bar underneath still */}
          {todayInRange && (
            <li
              aria-hidden
              data-plan-today
              className="pointer-events-none absolute inset-y-0 right-0 z-10"
              style={{ left: "var(--plan-label)" }}
            >
              <span className="absolute inset-y-0 w-px bg-magenta" style={{ left: `${clamp(nowPct)}%` }} />
            </li>
          )}
          {scrub !== null && (
            <li
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-20"
              style={{ left: "var(--plan-label)" }}
            >
              <span
                data-plan-scrub={dateAt(scrub)}
                className="absolute inset-y-0 w-px bg-ink"
                style={{ left: `${scrub}%` }}
              />
              <span
                data-plan-scrub-date
                className="absolute -top-5 -translate-x-1/2 rounded-[4px] bg-ink px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-surface"
                style={{ left: `${scrub}%` }}
              >
                {fmt(dateAt(scrub))}
              </span>
            </li>
          )}

          {lines.map(({ row, band }) => {
            const kids = row.children.length;
            const isOpen = !shut.has(row.id);
            return (
              <li
                key={row.id}
                data-plan-row={row.mark}
                data-plan-band={band ? "release" : undefined}
                className="flex h-[34px] items-center border-b border-line/40"
              >
                <span
                  style={{ width: "var(--plan-label)" }}
                  className={
                    "flex shrink-0 items-center gap-2 overflow-hidden pr-2 text-[13px] " +
                    (band ? "text-ink" : "text-ink-2")
                  }
                >
                  {band && kids > 0 ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${row.title}`}
                      onClick={() =>
                        setShut((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                      className="h-[18px] w-[18px] shrink-0 text-[12px] text-ink-2"
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                  ) : (
                    <span aria-hidden className="w-[18px] shrink-0" />
                  )}
                  <span className="w-[34px] shrink-0 tabular-nums text-[12px] text-ink-3">
                    {row.mark}
                  </span>
                  <span className={"truncate " + (band ? "font-bold" : "font-medium")}>
                    {row.title || "Untitled"}
                  </span>
                </span>
                <span className="relative h-full flex-1">
                  <Bar row={row} pct={pct} clamp={clamp} onHover={setHover} band={band} />
                </span>
              </li>
            );
          })}
        </ul>

        {/* The hovered bar's own text. A native `title` stays on each bar for
            screen readers and for tests; this is the visible one. */}
        {hover && (
          <div
            aria-hidden
            data-plan-tip
            className="pointer-events-none absolute -bottom-7 z-20 rounded-[4px] bg-ink px-2 py-1 text-[11px] whitespace-nowrap text-surface"
            style={{ left: "var(--plan-label)" }}
          >
            {hover}
          </div>
        )}

      </div>

      {footnote && (
        <p className="mt-9 text-[13px] text-ink-2">
          The same plan tool you&apos;ll use on your work orders.
        </p>
      )}
    </section>
  );
}

function Bar({
  row,
  pct,
  clamp,
  onHover,
  band = false,
}: {
  row: PublicPlanRow;
  pct: (iso: string) => number;
  clamp: (n: number) => number;
  onHover: (v: string | null) => void;
  /** A release band: taller and hollow, so it reads as the span containing the
   *  phases below it rather than as another bar beside them. */
  band?: boolean;
}) {
  const label = barLabel(row);
  /* Declared hooks. The tooltip is PRESENTATION — it formats "Dec 1" — so a
     test that parsed it broke the moment the format changed (`E803`). */
  const dates = { "data-plan-start": row.start ?? "", "data-plan-end": row.end ?? "" };
  const hoverProps = {
    onPointerEnter: () => onHover(label),
    onPointerLeave: () => onHover(null),
  };

  if (row.type === "milestone") {
    if (!row.start && !row.end) return null;
    const at = clamp(pct((row.start ?? row.end)!));
    return (
      <span
        data-plan-bar="milestone"
        title={label}
        {...hoverProps}
      {...dates}
        {...dates}
        className="absolute top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface"
        style={{ left: `${at}%` }}
      />
    );
  }

  /* A start with no end runs to the right edge with a fade, never "not
     scheduled" — it has a date, and discarding it was the `E797` defect. */
  if (row.start && !row.end) {
    const left = clamp(pct(row.start));
    return (
      <span
        data-plan-bar="top-open"
        title={label}
        {...hoverProps}
      {...dates}
        {...dates}
        className={`absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-l-full ${STATUS_BAR[row.status] ?? STATUS_BAR.Planned}`}
        style={{
          left: `${left}%`,
          width: `${Math.max(100 - left, 1)}%`,
          maskImage: "linear-gradient(to right, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 60%, transparent 100%)",
        }}
      />
    );
  }

  if (!row.start) {
    return (
      <span
        data-plan-bar="none"
        title={label}
        {...hoverProps}
      {...dates}
        {...dates}
        className="absolute top-1/2 left-0 -translate-y-1/2 bg-surface pr-1 font-mono text-[10px] text-ink-3"
      >
        — not scheduled
      </span>
    );
  }

  const left = clamp(pct(row.start));
  const w = Math.max(clamp(pct(row.end!)) - left, 0.8);
  return (
    <span
      data-plan-bar="top"
      title={label}
      {...hoverProps}
      {...dates}
      className={
        band
          ? "absolute top-1/2 block h-3.5 -translate-y-1/2 rounded-[3px] border border-ink/35 bg-ink/[0.04]"
          : `absolute top-1/2 block h-1.5 -translate-y-1/2 rounded-full ${STATUS_BAR[row.status] ?? STATUS_BAR.Planned}`
      }
      style={{ left: `${left}%`, width: `${w}%` }}
    />
  );
}

/** Week ticks across the span, thinned to ~12 so labels never collide. */
function weekTicks(from: number, to: number): { iso: string; label: string }[] {
  /* The mockup steps the axis every 14 days; a long plan still thins so the
     labels cannot collide (`E777`'s rule). */
  const week = 7 * DAY;
  const weeks = Math.max(1, Math.round((to - from) / week));
  const every = Math.max(2, Math.ceil(weeks / 10));
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i <= weeks; i += every) {
    const iso = new Date(from + i * week).toISOString().slice(0, 10);
    out.push({ iso, label: fmt(iso) });
  }
  return out;
}
