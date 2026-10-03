"use client";

/**
 * THE PLAN GRID on `/status` (`P2-ALL-E803`).
 *
 * Replaces the "phase by phase" accordions. Columns: # · Name · Owner · Start ·
 * End · Status. A phase row expands to its child rows; Build (the in-progress
 * phase) is open by default, everything else collapsed. Scott, 2026-10-03.
 *
 * It renders `PublicPlanRow`, which has no `admin_note` and no `hours` by
 * shape — so this file cannot leak either.
 */

import { useState } from "react";
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";

const HEAD = "font-display font-bold tracking-[-0.3px]";

const fmt = (iso: string | null) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        /* Pure dates in UTC, or they shift a day in Eastern (`E775`). */
        timeZone: "UTC",
      })
    : "—";

export function PlanGrid({ plan }: { plan: PublicPlan }) {
  /**
   * Open by default: the in-progress phase, which is Build today. Derived from
   * the data rather than hard-coded to a title, so it follows the plan.
   */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    /*
      Open by default: every RELEASE heading, and any row that is In progress at
      any depth (`E807`). So R1 and the Build phase inside it are both expanded
      on arrival, which is what "Build open by default" means now that Build sits
      one level in. Derived from the data, never hard-coded to a title.
    */
    const ids = new Set<string>();
    const walk = (rows: readonly PublicPlanRow[]) => {
      for (const r of rows) {
        if (r.type === "release" || r.status === "In progress") ids.add(r.id);
        walk(r.children);
      }
    };
    walk(plan.rows);
    return ids;
  });
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className={`text-[24px] text-ink ${HEAD}`}>The plan</h2>

      {/* Header. Owner and the dates leave at phone width, where the row
          carries them underneath the name instead. */}
      <div className="mt-5 grid grid-cols-[2.5rem_1fr_auto] gap-x-3 border-b border-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3 sm:grid-cols-[2.5rem_1fr_8rem_5rem_5rem_6rem]">
        <span>#</span>
        <span>Name</span>
        <span className="hidden sm:block">Owner</span>
        <span className="hidden sm:block">Start</span>
        <span className="hidden sm:block">End</span>
        <span className="text-right sm:text-left">Status</span>
      </div>

      <div>
        {plan.rows.map((row) => (
          <Branch key={row.id} row={row} depth={0} open={open} toggle={toggle} />
        ))}
      </div>
    </section>
  );
}

/**
 * One row and, when it is open, its children — release → phase → task
 * (`P2-ALL-E807`). Recursive, so a third level needs no second code path.
 */
function Branch({
  row,
  depth,
  open,
  toggle,
}: {
  row: PublicPlanRow;
  depth: number;
  open: ReadonlySet<string>;
  toggle: (id: string) => void;
}) {
  const isOpen = open.has(row.id);
  const kids = row.children.length;
  const isRelease = row.type === "release";

  return (
    <div>
      {kids > 0 ? (
        <button
          type="button"
          onClick={() => toggle(row.id)}
          aria-expanded={isOpen}
          className={
            "w-full text-left transition-colors hover:bg-black/[0.02] " +
            /* A release heading is the strongest line on the grid; a phase
               inside one is lighter than a top-level phase. */
            (isRelease ? "border-b border-ink/20" : "border-b border-line")
          }
        >
          <Cells row={row} depth={depth} marker={isOpen ? "▾" : "▸"} kids={kids} />
        </button>
      ) : (
        <div className={isRelease ? "border-b border-ink/20" : "border-b border-line"}>
          <Cells row={row} depth={depth} />
        </div>
      )}

      {isOpen &&
        row.children.map((kid) => (
          <Branch key={kid.id} row={kid} depth={depth + 1} open={open} toggle={toggle} />
        ))}
    </div>
  );
}

function Cells({
  row,
  depth,
  marker,
  kids = 0,
}: {
  row: PublicPlanRow;
  depth: number;
  marker?: string;
  kids?: number;
}) {
  const isRelease = row.type === "release";
  return (
    <div
      data-plan-grid-row={row.number || row.title}
      data-plan-grid-depth={depth}
      /* 44px rows: this is a tap target on a phone. */
      className={
        "grid min-h-11 grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 py-2 text-[13px] sm:grid-cols-[2.5rem_1fr_8rem_5rem_5rem_6rem] " +
        (isRelease ? "bg-black/[0.02]" : "")
      }
    >
      <span className="flex items-baseline gap-1 tabular-nums text-[11px] text-ink-3">
        {marker && <span aria-hidden className="text-[9px]">{marker}</span>}
        {row.number}
      </span>

      <span className="min-w-0" style={{ paddingLeft: `${depth * 0.75}rem` }}>
        <span
          className={
            "block truncate " +
            (isRelease
              ? `text-[15px] text-ink ${HEAD}`
              : depth === 0 || row.children.length > 0
                ? "font-bold text-ink"
                : "text-ink-2")
          }
        >
          {row.title || "Untitled"}
          {kids > 0 && <span className="ml-2 text-[11px] font-normal text-ink-3">{kids}</span>}
        </span>
        {/* The row's public note — content Scott wrote for visitors. */}
        {row.note && (
          <span className="mt-0.5 block max-w-[70ch] text-[12px] leading-relaxed text-ink-2">
            {row.note}
          </span>
        )}
        {/* Phone: the columns that left the header reappear here, so no data is
            lost at 390px. */}
        <span className="mt-0.5 block truncate text-[11px] text-ink-3 sm:hidden">
          {[row.owner, row.start || row.end ? `${fmt(row.start)} – ${fmt(row.end)}` : "Not scheduled"]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>

      <span className="hidden truncate text-[12px] text-ink-2 sm:block">{row.owner || "—"}</span>
      <span className="hidden tabular-nums text-[11px] text-ink-2 sm:block">{fmt(row.start)}</span>
      <span className="hidden tabular-nums text-[11px] text-ink-2 sm:block">{fmt(row.end)}</span>

      <span className="flex items-center justify-end gap-1.5 sm:justify-start">
        {row.late && (
          <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-magenta">Past due</span>
        )}
        {/*
          A RELEASE HEADING SHOWS ITS OWN PERCENTAGE (Scott, 2026-10-03), from
          the same half-credit rule as the hero. A release with nothing countable
          under it prints no figure rather than 0%.
        */}
        {isRelease && row.progress?.percent !== null && row.progress !== null ? (
          <span
            data-plan-release-pct={row.progress.percent}
            className={`text-[13px] text-ink ${HEAD}`}
          >
            {row.progress.percent}%
          </span>
        ) : (
          <span className={"text-[12px] " + (row.status === "Done" ? "font-bold text-ink" : "text-ink-2")}>
            {row.type === "milestone" && row.status === "Planned" ? "Milestone" : row.status}
          </span>
        )}
      </span>
    </div>
  );
}
