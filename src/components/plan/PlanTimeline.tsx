"use client";

/**
 * ── THE PLAN TIMELINE (`P2-ALL-E797`) ───────────────────────────────────────
 *
 * ⚠⚠ **IT IS A CLIENT COMPONENT ONLY BECAUSE PHASES COLLAPSE.** Scott, walking
 * `/status` 2026-10-03: a phase with children shows `▸` and starts collapsed —
 * one bar — and clicking it expands its rows in place.
 * ⚠⚠⚠ **IT REMEMBERS NOTHING. Collapsed on every load**, by his instruction, so
 * there is no storage, no cookie and no URL state — a fresh visitor and a
 * returning one see the same chart.
 *
 * ⚠ The rest of `/status` stays a server component; only this section hydrates.
 */

import { useState } from "react";
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";

const STATUS_BAR: Record<string, string> = {
  Done: "bg-ink",
  "In progress": "bg-magenta/60",
  Blocked: "bg-magenta/25",
  Planned: "border border-dashed border-ink-3",
};

export function PlanTimeline({ plan, today }: { plan: PublicPlan; today: string }) {
  /** ⚠ Collapsed by default: an empty set, and nothing ever persists it. */
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const span = plan.span;
  if (!span) {
    return (
      <section className="mt-10">
        <p className="text-[14px] text-ink-2">No dates are set yet, so there is no timeline to show.</p>
      </section>
    );
  }

  const from = Date.parse(`${span.start}T00:00:00Z`);
  const to = Date.parse(`${span.end}T00:00:00Z`);
  const width = Math.max(to - from, 86_400_000);
  const pct = (iso: string) => ((Date.parse(`${iso}T00:00:00Z`) - from) / width) * 100;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const nowPct = pct(today);
  const todayInRange = nowPct >= 0 && nowPct <= 100;
  const ticks = weekTicks(from, to);

  /**
   * ⚠⚠⚠ THE ROW LIST IS BUILT ONCE, IN RENDER ORDER, AND EVERY ROW CARRIES ITS
   * OWN DATA. The previous version derived `isChild` by searching the top-level
   * array for each row's id, which meant the flat list and the lookup were two
   * descriptions of one structure — exactly the shape that lets a label and a
   * bar disagree about which row they belong to.
   */
  const lines: { row: PublicPlanRow; isChild: boolean; kids: number }[] = [];
  for (const top of plan.rows) {
    lines.push({ row: top, isChild: false, kids: top.children.length });
    if (open.has(top.id)) {
      for (const kid of top.children) lines.push({ row: kid, isChild: true, kids: 0 });
    }
  }

  return (
    <section className="mt-10" aria-label="Plan timeline">
      {/*
        ── ⚠⚠⚠ ONE COLUMN WIDTH, DEFINED ONCE (`P2-ALL-E798`) ─────────────────
        ⚠ **SCOTT, 2026-10-03, MINUTES AFTER `E797` DEPLOYED:** the date axis was
        laid out across the FULL width while the bars and the Today line used
        only the track to the right of the labels — so every bar read about four
        weeks late, and `Define`, which ran Aug 15–22, sat under *"Sep 12"*.
        ⚠⚠⚠ **A CHART WHOSE AXIS AND BARS USE DIFFERENT COORDINATE SPACES IS
        WORSE THAN NO CHART**: it is confidently wrong, and the only clue was
        knowing the real dates.
        ⚠⚠ **`--plan-label` IS THE ONE DEFINITION.** The label box takes its
        WIDTH from it and the axis and the Today line take their LEFT OFFSET from
        it, so the three cannot drift apart (`E585`). ⚠ The rows carry NO gap for
        the same reason — a gap would be a second, invisible offset that only the
        bars felt.
      */}
      <div className="relative [--plan-label:8rem] sm:[--plan-label:12rem]">
        <div
          className="relative h-5 border-b border-line"
          style={{ marginLeft: "var(--plan-label)" }}
        >
          {ticks.map((t, i) => (
            <span
              key={t.iso}
              /** ⚠ The tick carries its DATE, so a test can derive the axis's
               *  own scale from it rather than recomputing the component's. */
              data-plan-tick={t.iso}
              className={
                "absolute top-0 -translate-x-1/2 font-mono text-[10px] text-ink-3 " +
                /*
                  ── ⚠⚠⚠ EVERY THIRD LABEL ON A PHONE (`E798`) ────────────────
                  ⚠ `weekTicks` thins to ~12 labels by SPAN, which knew nothing
                  about the width — and moving the axis out of the label column
                  took ~128px off it at 390px, so the labels collided. ⚠⚠ That is
                  `E777`'s rule, broken by a layout change rather than by a copy
                  change.
                  ⚠⚠ **IT IS DONE IN CSS, NOT BY MEASURING.** A client component
                  that sized its own axis would render one count on the server and
                  another after hydration; a breakpoint renders once and is right
                  in both.
                  ⚠ Four labels across ~230px of phone track, twelve across ~1000px.
                */
                (i % 3 === 0 ? "" : "hidden sm:inline")
              }
              style={{ left: `${clamp(pct(t.iso))}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <ul className="relative mt-2">
          {todayInRange && (
            /** ⚠⚠ TWO BOXES, NOT ONE: the outer `<li>` IS the track — inset from
             *  the left by the label column and flush to the right edge — and the
             *  line inside it is a percentage OF THAT BOX. ⚠ Positioning the line
             *  directly against the `<ul>` is what put it four weeks out. */
            <li
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 z-10"
              style={{ left: "var(--plan-label)" }}
            >
              <span
                className="absolute inset-y-0 w-px bg-magenta"
                style={{ left: `${clamp(nowPct)}%` }}
              />
            </li>
          )}
          {lines.map(({ row, isChild, kids }) => {
            const expandable = kids > 0;
            const isOpen = open.has(row.id);
            return (
              <li key={row.id} data-plan-row={row.number} className="flex h-8 items-center">
                <span
                  /** ⚠ `pr-2` RATHER THAN A FLEX GAP: the padding is INSIDE the
                   *  label box, so the box's width still equals the axis offset
                   *  exactly. A gap would sit between them and belong to
                   *  neither. */
                  style={{ width: "var(--plan-label)" }}
                  className={
                    "flex shrink-0 items-baseline gap-1.5 overflow-hidden pr-2 " +
                    (isChild ? "text-ink-3" : "text-ink-2")
                  }
                >
                  {expandable ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      aria-expanded={isOpen}
                      /** ⚠ The whole label is the control, so the hit area is the
                       *  row rather than a 10px arrow. */
                      className="flex min-w-0 items-baseline gap-1.5 text-left"
                    >
                      <span aria-hidden className="shrink-0 text-[9px] text-ink-3">
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span className="shrink-0 font-mono text-[10px]">{row.number}</span>
                      <span className="truncate text-[11px] font-semibold">{row.title || "Untitled"}</span>
                      {/*
                        ⚠⚠ THE COUNT IS WHAT A COLLAPSED PHASE OWES THE READER —
                        one bar with nothing beside it hides that there are ten
                        rows underneath.
                        ⚠ "journeys" is THIS plan's vocabulary (Scott's words). A
                        work order reusing this component in R2 will need the noun
                        parameterised; it is hard-coded now rather than guessed.
                      */}
                      <span className="shrink-0 whitespace-nowrap text-[10px] text-ink-3">
                        {kids} journeys
                      </span>
                    </button>
                  ) : (
                    <>
                      <span aria-hidden className="w-[9px] shrink-0" />
                      <span className="shrink-0 font-mono text-[10px]">{row.number}</span>
                      <span
                        className={"truncate text-[11px] " + (isChild ? "font-normal" : "font-semibold")}
                      >
                        {row.title || "Untitled"}
                      </span>
                    </>
                  )}
                </span>
                <span className="relative h-8 flex-1">
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
  isChild,
}: {
  row: PublicPlanRow;
  pct: (iso: string) => number;
  clamp: (n: number) => number;
  isChild: boolean;
}) {
  const height = isChild ? "h-1" : "h-1.5";

  if (row.type === "milestone") {
    if (!row.start && !row.end) return null;
    const at = clamp(pct((row.start ?? row.end)!));
    return (
      <span
        data-plan-bar="milestone"
        title={`${row.number} ${row.title} — ${row.start ?? row.end}`}
        className="absolute top-1/2 block h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-ink bg-surface"
        style={{ left: `${at}%` }}
      />
    );
  }

  /**
   * ── ⚠⚠⚠ A START WITH NO END IS AN OPEN BAR, NOT "NOT SCHEDULED" ───────────
   *
   * ⚠ **SCOTT, 2026-10-03:** `6 Operate` has a start of Dec 1 and no end, and
   * the chart called it *"not scheduled"* — which is false, and it threw away
   * the one date he had entered.
   * ⚠⚠ It runs from its start to the right edge with a SQUARE right end and a
   * fade, so "we do not know when this stops" reads differently from a bar that
   * ends on a date. ⚠ `E549`'s rule in a picture: a missing end is not evidence
   * the work ended, and it is not evidence it runs forever either.
   */
  if (row.start && !row.end) {
    const left = clamp(pct(row.start));
    return (
      <span
        data-plan-bar={isChild ? "task-open" : "top-open"}
        title={`${row.number} ${row.title} — from ${row.start}, no end date · ${row.status}`}
        className={
          `absolute top-1/2 block -translate-y-1/2 rounded-l-full ${height} ` +
          (STATUS_BAR[row.status] ?? STATUS_BAR.Planned)
        }
        style={{
          left: `${left}%`,
          width: `${Math.max(100 - left, 1)}%`,
          /** ⚠ The fade IS the "no end" signal, so it is part of the bar rather
           *  than a legend somebody has to find. */
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
        title={`${row.number} ${row.title} — not scheduled`}
        className="absolute top-1/2 left-0 -translate-y-1/2 bg-surface pr-1 font-mono text-[10px] text-ink-3"
      >
        — not scheduled
      </span>
    );
  }

  const left = clamp(pct(row.start));
  const right = clamp(pct(row.end!));
  const w = Math.max(right - left, 0.8);
  return (
    <span
      data-plan-bar={isChild ? "task" : "top"}
      /** ⚠⚠ THE TOOLTIP NAMES ITS OWN ROW NUMBER. Scott saw `3.3 Profile` show
       *  "3.2 Register"; including the number in the text means a future
       *  mismatch is visible in the tooltip itself, not only in a test. */
      title={`${row.number} ${row.title} — ${row.start} to ${row.end} · ${row.status}`}
      className={
        `absolute top-1/2 block -translate-y-1/2 rounded-full ${height} ` +
        (STATUS_BAR[row.status] ?? STATUS_BAR.Planned)
      }
      style={{ left: `${left}%`, width: `${w}%` }}
    />
  );
}

function weekTicks(from: number, to: number): { iso: string; label: string }[] {
  const week = 7 * 86_400_000;
  const weeks = Math.max(1, Math.round((to - from) / week));
  const every = Math.max(1, Math.ceil(weeks / 12));
  const out: { iso: string; label: string }[] = [];
  for (let i = 0; i <= weeks; i += every) {
    const d = new Date(from + i * week);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    });
  }
  return out;
}
