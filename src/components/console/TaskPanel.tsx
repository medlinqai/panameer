"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, History, X } from "lucide-react";
import { reportsFor, type Report } from "@/lib/admin-reports";
import { recordRecent, readRecentForDisplay, type Recent } from "@/lib/admin-recent";

/**
 * THE RIGHT-MARGIN TASK PANEL (WS3, 2.5 image 2 — ported from Medlinq's
 * `provider/TaskPanel` + `medlinq/MedlinqTaskPanel`).
 *
 * A thin icon strip fixed to the right edge and vertically centred, with three
 * tabs — Reports (ClipboardList), Recent (History), Analytics (BarChart3).
 * Clicking one floats a card to its LEFT; clicking outside or pressing Escape
 * closes it.
 *
 * WHY FIXED AND CENTRED rather than a column in the page grid: the console
 * pages are full-width tables, and a permanent third column would squeeze them
 * at 1440. Medlinq settled on the same answer for the same reason, and the
 * strip stays put as the page scrolls so it never scrolls out of reach.
 *
 * Desktop only. At 375 there is no right margin to put it in, and every report
 * it offers is reachable from the page's own volume tiles.
 */

/*
  ── ⚠⚠ TASKS · ACTIVITY · REPORTS (`P1-A1.5-E459`) ──────────────────────────

  **SCOTT, 2026-09-12:** *"Oracle uses the clipboard for TASKS. I just called it
  actions. we can use tasks. the icon is right, the name is wrong."*
  ⚠ NOT "Actions" — he corrected himself minutes later. **Tasks.**

  ⚠ SUPERSEDED, quoted not deleted:
    { key: "reports",   label: "Reports",   Icon: ClipboardList },
    { key: "recent",    label: "Recent",    Icon: History },
    { key: "analytics", label: "Analytics", Icon: BarChart3 },

  ⚠⚠ THIS IS A COLLISION BEING FIXED, NOT A PREFERENCE. TWO panels were about
  reports: the clipboard one was literally called Reports, and the bar-chart
  one's own empty state reads *"Reports follow this page's Volume-Over-Time
  metrics."* Two panels called Reports is why neither was obvious. After the
  rename, `Reports` means one thing.

  ⚠ THE TRIO IS THE ORACLE CONVENTION AND IS SETTLED NAMING. Panameer's users
  are Oracle practitioners; if the clipboard means Tasks for the rest of their
  working day, calling it anything else makes them learn something for no reason.

  ⚠ THE KEYS MOVED WITH THE LABELS, deliberately. Leaving `key: "reports"` on the
  panel now called Tasks would mean `active === "tasks"` renders Tasks — the
  exact ambiguity this rename removes, just relocated into the code. The keys are
  used in four comparisons in this file and NOWHERE else (checked), so the rename
  is contained.
  ⚠ THE ICONS ARE UNTOUCHED: clipboard, history, bar chart, in that order.
*/
type TabKey = "tasks" | "activity" | "reports";

const TABS: { key: TabKey; label: string; Icon: typeof BarChart3 }[] = [
  { key: "tasks", label: "Tasks", Icon: ClipboardList },
  { key: "activity", label: "Activity", Icon: History },
  { key: "reports", label: "Reports", Icon: BarChart3 },
];

export function TaskPanel() {
  const pathname = usePathname() ?? "";
  const [active, setActive] = useState<TabKey | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pathname.startsWith("/admin")) return;
    recordRecent(pathname);
    setRecent(readRecentForDisplay(pathname));
  }, [pathname]);

  // Close on outside-click and Escape, like any popover. The ref wraps BOTH the
  // card and the strip, so clicking a tab doesn't close what the tab opens.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (!pathname.startsWith("/admin")) return null;

  const reports: Report[] = reportsFor(pathname);
  const def = TABS.find((t) => t.key === active) ?? null;

  const row = (key: string, label: string, href: string, Icon: typeof BarChart3) => (
    <Link
      key={key}
      href={href}
      onClick={() => setActive(null)}
      className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium transition-colors hover:bg-magenta/[0.07]"
    >
      <Icon className="h-[17px] w-[17px] shrink-0 text-magenta" strokeWidth={1.9} />
      <span className="truncate">{label}</span>
    </Link>
  );

  const emptyState = (Icon: typeof BarChart3, title: string, sub: string) => (
    <div className="flex flex-col items-center gap-2 px-2 py-12 text-center">
      <Icon className="h-8 w-8 text-ink-2/25" strokeWidth={1.2} />
      <p className="text-[14px] font-semibold text-ink-2">{title}</p>
      <p className="text-[12.5px] text-ink-2/70">{sub}</p>
    </div>
  );

  return (
    <div
      ref={ref}
      className="fixed right-2 top-1/2 z-40 hidden -translate-y-1/2 items-stretch gap-2 lg:flex"
    >
      {def && (
        <div className="flex max-h-[80vh] w-80 flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <span className="flex items-center gap-2">
              <def.Icon className="h-[17px] w-[17px] text-magenta" strokeWidth={1.9} />
              <span className="text-[14px] font-bold">{def.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Collapse panel"
              className="rounded-md p-1 text-ink-2/60 transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {active === "tasks" &&
              (reports.length === 0
                ? emptyState(
                    ClipboardList,
                    "No reports here yet",
                    "Reports follow this page's Volume-Over-Time metrics — this page hasn't defined any."
                  )
                : reports.map((r) => row(r.href, r.label, r.href, ClipboardList)))}

            {active === "activity" &&
              (recent.length === 0
                ? emptyState(
                    History,
                    "No recent pages",
                    "Admin pages you visit show up here."
                  )
                : recent.map((r) => row(r.href, r.label, r.href, History)))}

            {active === "reports" &&
              emptyState(
                BarChart3,
                "Analytics isn't built",
                "Cross-page analytics needs the transaction layer. The per-metric report shells under Reports are the first step."
              )}
          </div>
        </div>
      )}

      {/*
        ⚠⚠ ALL THREE ARE LABELLED IN THE STRIP (`E459`). **SCOTT, twice:**
        *"Label all three"* — an unlabeled icon goes unused. The strip was
        `w-12` and icon-only, with the name available only as a `title` tooltip,
        which is invisible on first read and unreachable by touch.
        ⚠ THE TOOLTIP AND `aria-label` STAY: the visible label is 10px, and the
        title is what a screen reader and a hover both still get.
      */}
      <div className="flex w-[62px] flex-col items-center gap-1 self-center rounded-[16px] border border-line bg-white py-2 shadow-lg">
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive((a) => (a === t.key ? null : t.key))}
              title={t.label}
              aria-label={t.label}
              aria-pressed={on}
              className={
                "flex w-[54px] flex-col items-center gap-0.5 rounded-[10px] px-1 py-1.5 transition-colors " +
                (on
                  ? "bg-magenta text-white"
                  : "text-ink-2 hover:bg-magenta/[0.08] hover:text-magenta")
              }
            >
              <t.Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              <span className="text-[10px] font-semibold leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
