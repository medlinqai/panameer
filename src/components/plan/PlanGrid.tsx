"use client";

import { useMemo, useState } from "react";
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

type Line = { row: PublicPlanRow; level: 1 | 2 | 3; ancestors: string[] };

/** Depth-first, so the table reads in outline order. */
function lines(rows: readonly PublicPlanRow[], level: 1 | 2 | 3, ancestors: string[]): Line[] {
  const out: Line[] = [];
  for (const row of rows) {
    out.push({ row, level, ancestors });
    if (row.children.length > 0 && level < 3) {
      out.push(...lines(row.children, (level + 1) as 2 | 3, [...ancestors, row.id]));
    }
  }
  return out;
}

export function PlanGrid({ plan, subtitle }: { plan: PublicPlan; subtitle?: string }) {
  const all = useMemo(() => lines(plan.rows, 1, []), [plan.rows]);

  /** Open on arrival: every release, and any row that is In progress at any */
  const [open, setOpen] = useState<ReadonlySet<string>>(() => {
    const ids = new Set<string>();
    for (const { row } of all) {
      if (row.type === "release" || row.status === "In progress") ids.add(row.id);
    }
    return ids;
  });
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visible = all.filter((l) => l.ancestors.every((a) => open.has(a)));

  return (
    <section className="mt-12 border-t border-line pt-6">
      <h2 className={`text-[24px] text-ink ${HEAD}`}>See the Details</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        {subtitle ?? "Release, stage and task. Click a row to open it."}
      </p>

      <table className="mt-4 w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {/* NO OWNER COLUMN ON THE PUBLIC PAGE , . Scott */}
            {["#", "Name", "Start", "End", "Status"].map((h) => (
              <th
                key={h}
                scope="col"
                className={
                  "border-b border-ink px-1.5 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-ink-3 " +
                  /* Owner leaves at phone width, as the mockup does. */
                  (h === "#" ? "w-[60px]" : "")
                }
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map(({ row, level }) => {
            const kids = row.children.length;
            const isOpen = open.has(row.id);
            return (
              <tr
                key={row.id}
                data-plan-grid-row={row.mark}
                data-plan-grid-level={level}
                className={
                  "border-b border-line/60 " +
                  (level === 1
                    ? "bg-black/[0.015] text-[14px] font-bold text-ink"
                    : level === 2
                      ? "font-semibold text-ink"
                      : "text-ink-2")
                }
              >
                <td className="h-11 px-1.5 py-2 align-middle tabular-nums text-ink-3">{row.mark}</td>
                <td
                  className="py-2 pr-1.5 align-middle"
                  /* ONE STEP, TASKS ONLY (Scott / the mockup): stages sit at the
                     same offset as their release. */
                  style={{ paddingLeft: level === 3 ? 30 : 6 }}
                >
                  {kids > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      aria-expanded={isOpen}
                      className="mr-1 inline-flex h-[18px] w-[18px] items-center justify-center text-[12px] text-ink-2"
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                  ) : (
                    <span aria-hidden className="mr-1 inline-block w-[18px]" />
                  )}
                  {row.title || "Untitled"}
                  {kids > 0 && <span className="ml-1.5 font-normal text-ink-3">{kids}</span>}
                  {row.note && (
                    <span className="mt-0.5 block max-w-[70ch] text-[12px] font-normal leading-relaxed text-ink-2">
                      {row.note}
                    </span>
                  )}
                </td>
                <td className="px-1.5 py-2 align-middle font-normal tabular-nums text-ink-2">
                  {fmt(row.start)}
                </td>
                <td className="px-1.5 py-2 align-middle font-normal tabular-nums text-ink-2">
                  {/* A start with no end is open-ended — an arrow, not a dash,
                      and a milestone shows nothing (its date is its start). */}
                  {row.end ? fmt(row.end) : row.type === "milestone" ? "" : "→"}
                </td>
                <td className="px-1.5 py-2 align-middle">
                  {row.late && (
                    <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-magenta">
                      Past due
                    </span>
                  )}
                  {/* A RELEASE SHOWS ITS PERCENTAGE, not a status — the figure is */}
                  {level === 1 && row.progress && row.progress.percent !== null ? (
                    <span data-plan-release-pct={row.progress.percent} className="font-bold text-ink">
                      {row.progress.percent}%
                    </span>
                  ) : (
                    <span
                      className={
                        "font-semibold " +
                        (row.status === "Done"
                          ? "text-ink"
                          : row.status === "In progress"
                            ? "text-magenta"
                            : "text-ink-3")
                      }
                    >
                      {row.type === "milestone" ? "Milestone" : row.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
