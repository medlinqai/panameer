"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, History, Receipt, SlidersHorizontal, X } from "lucide-react";
import { drawerGroups } from "@/lib/admin-drawers";
import { RailIcon } from "@/components/casing/RailIcon";
import { reportsFor, type Report } from "@/lib/admin-reports";
import { recordRecent, readRecentForDisplay, type Recent } from "@/lib/admin-recent";

type TabKey = "tasks" | "transactions" | "configuration" | "activity" | "reports";

const TABS: { key: TabKey; label: string; Icon: typeof BarChart3 }[] = [
  { key: "tasks", label: "Tasks", Icon: ClipboardList },
  { key: "transactions", label: "Transact", Icon: Receipt },
  { key: "configuration", label: "Config", Icon: SlidersHorizontal },
  { key: "activity", label: "Activity", Icon: History },
  { key: "reports", label: "Reports", Icon: BarChart3 },
];

const FULL_LABEL: Partial<Record<TabKey, string>> = {
  transactions: "Transactions",
  configuration: "Configuration",
};

const groupsFor = (key: TabKey) =>
  key === "transactions" || key === "configuration" ? drawerGroups(key) : [];

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
      className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left text-[14px] font-medium transition-colors hover:bg-magenta/[0.07]"
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
        <div
          style={{ maxHeight: "calc(100dvh - var(--pm-band-h, 56px) - 2.5rem)" }}
          className="z-50 flex w-80 flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <span className="flex items-center gap-2">
              <def.Icon className="h-[17px] w-[17px] text-magenta" strokeWidth={1.9} />
              <span className="text-[14px] font-bold">{FULL_LABEL[def.key] ?? def.label}</span>
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

            {(active === "transactions" || active === "configuration") &&
              groupsFor(active).map((group) => (
                <section key={group.title ?? group.items[0]?.href}>
                  {}
                  {group.title && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2/60">
                      {group.title}
                    </p>
                  )}
                  <nav aria-label={group.title ?? FULL_LABEL[active]} className="flex flex-col pb-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={
                          pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined
                        }
                        /* ⚠ Closed ON THE CLICK, not in an effect keyed on
                           `pathname` — `set-state-in-effect` is the error this
                           repo carries eleven of and the rule is 0 NEW. */
                        onClick={() => setActive(null)}
                        /* ⚠⚠ 44px ROWS (Scott, D2). `py-2.5` measured 40px. */
                        className={
                          "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left text-[14px] transition-colors hover:bg-magenta/[0.07] " +
                          (pathname === item.href || pathname.startsWith(`${item.href}/`)
                            ? "bg-black/[0.05] font-semibold text-ink"
                            : "font-medium text-ink")
                        }
                      >
                        <RailIcon name={item.icon} className="h-[17px] w-[17px] text-magenta" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </nav>
                </section>
              ))}

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
              title={FULL_LABEL[t.key] ?? t.label}
              aria-label={FULL_LABEL[t.key] ?? t.label}
              aria-pressed={on}
              /* ⚠⚠ `min-h-11` = 44px (Scott, D2). The icon-plus-label stack
                 measured ~38px, under the touch standard the rest of the shell
                 already meets. */
              className={
                "flex min-h-11 w-[54px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-1 py-1.5 transition-colors " +
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
