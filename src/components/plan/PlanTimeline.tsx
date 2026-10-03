"use client";

/**
 * THE PHASE TIMELINE on `/status` (`P2-ALL-E803`).
 *
 * Top-level rows only — phases and milestones, never child rows. Scott,
 * 2026-10-03: the child rows live in the grid below, not in the chart.
 * Client-side only because of the scrubber.
 */

import { useRef, useState } from "react";
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";

const HEAD_BAND = "font-display font-bold tracking-[-0.2px]";

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
  title: string;
  start: string | null;
  end: string | null;
  status: string;
  type: string;
}): string {
  const name = `${row.number} ${row.title || "Untitled"}`;
  if (row.type === "milestone") {
    const at = row.start ?? row.end;
    return at ? `${name} · ${fmt(at)}` : `${name} · no date`;
  }
  if (row.start && row.end) return `${name} · ${fmt(row.start)} – ${fmt(row.end)} · ${row.status}`;
  if (row.start) return `${name} · from ${fmt(row.start)}, no end date · ${row.status}`;
  return `${name} · not scheduled · ${row.status}`;
}

export function PlanTimeline({ plan, today }: { plan: PublicPlan; today: string }) {
  /**
   * The AXIS row is the track: it already carries `marginLeft: var(--plan-label)`,
   * so its rect is exactly the box a date maps into. Measuring it beats
   * re-deriving the label width from a CSS variable in two units.
   */
  const axisRef = useRef<HTMLDivElement>(null);
  /** Scrubber position as a % of the track, or null when not scrubbing. */
  const [scrub, setScrub] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

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

  /**
   * RELEASES AS THE TOP BAND, PHASES UNDER THEM (Scott, 2026-10-03, `E807`).
   * Tasks stay out of the chart — they are the grid's job — so this is two
   * levels: each release, then its phases, then any top-level phase that sits
   * outside a release (Operate).
   */
  const rows: { row: PublicPlanRow; band: boolean }[] = [];
  for (const top of plan.rows) {
    if (top.type === "release") {
      rows.push({ row: top, band: true });
      for (const phase of top.children) rows.push({ row: phase, band: false });
    } else {
      rows.push({ row: top, band: false });
    }
  }

  return (
    <section className="mt-10" aria-label="Plan timeline">
      {/*
        `--plan-label` is the ONE definition of the label column: the label box
        takes its width from it and the axis, scrubber and today line take their
        left offset from it, so the three cannot drift apart (`E798`).
      */}
      <div
        data-plan-scrubarea
        className="relative touch-none [--plan-label:7rem] sm:[--plan-label:12rem]"
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
          {ticks.map((t, i) => (
            <span
              key={t.iso}
              data-plan-tick={t.iso}
              className={
                "absolute top-0 -translate-x-1/2 font-mono text-[10px] text-ink-3 " +
                /* Every third label on a phone: the track is ~230px there and
                   twelve labels collide (`E798`). CSS, not measurement, so the
                   server and the client render the same count. */
                (i % 3 === 0 ? "" : "hidden sm:inline")
              }
              style={{ left: `${clamp(pct(t.iso))}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/*
          THE ROWS. One list, so a label and its bar are the same element — they
          were briefly two lists and the pairing a tooltip test checks could not
          be made (`E803`).
        */}
        <ul className="relative mt-2">
          {/*
            THE SCRUBBER's marks. `pointer-events-none` so a bar underneath still
            receives hover — the handlers live on the wrapper below, which is why
            the line and the bar tooltip can both work at once.
          */}
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

          {rows.map(({ row, band }) => (
            <li
              key={row.id}
              data-plan-row={row.number || row.title}
              data-plan-band={band ? "release" : undefined}
              className={"flex items-center " + (band ? "h-9" : "h-8")}
            >
              <span
                style={{ width: "var(--plan-label)" }}
                className={
                  "flex shrink-0 items-baseline gap-1.5 overflow-hidden pr-2 " +
                  (band ? "text-ink" : "pl-2 text-ink-2")
                }
              >
                {!band && <span className="shrink-0 tabular-nums text-[10px]">{row.number}</span>}
                <span
                  className={
                    "truncate " + (band ? `text-[12px] ${HEAD_BAND}` : "text-[11px] font-semibold")
                  }
                >
                  {row.title || "Untitled"}
                </span>
              </span>
              <span className="relative h-full flex-1">
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rounded-full bg-line"
                />
                <Bar row={row} pct={pct} clamp={clamp} onHover={setHover} band={band} />
              </span>
            </li>
          ))}
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

      <p className="mt-9 text-[13px] text-ink-2">
        The same plan tool you&apos;ll use on your work orders.
      </p>
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
  const week = 7 * DAY;
  const weeks = Math.max(1, Math.round((to - from) / week));
  const every = Math.max(1, Math.ceil(weeks / 12));
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i <= weeks; i += every) {
    const iso = new Date(from + i * week).toISOString().slice(0, 10);
    out.push({ iso, label: fmt(iso) });
  }
  return out;
}
