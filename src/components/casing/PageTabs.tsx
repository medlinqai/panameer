import "./page-tabs.css";
import Link from "next/link";
import { StepDisc, StepConnector } from "@/components/casing/StepDisc";
import { ScrollRow } from "@/components/casing/ScrollRow";

export type PageTab = {
  label: string;
  href: string;
  /** Matched against the current path+query to pick the active tab. */
  match?: string;
  n?: number;
  state?: "live" | "early";
  badge?: number;
  done?: boolean;
};

export type TabSequence = "process" | "suggested" | "none";

export function PageTabs({
  tabs,
  current,
  sequence = "none",
  className = "",
  children,
  eyebrow,
  wrap = false,
}: {
  tabs: PageTab[];
  current: string;
  sequence?: TabSequence;
  className?: string;
  wrap?: boolean;
  /** Trailing controls — a Filters button, a count. Sits after the tabs. */
  children?: React.ReactNode;
  eyebrow?: string;
}) {
  const numbered = sequence === "process" || sequence === "suggested";

  return (
    <div className={"relative isolate " + className}>
      {}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 bottom-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-surface"
      />
      <div data-testid="page-tabs-wrap" className="-mx-1 mb-4 flex items-end border-b border-line bg-surface px-1">
      <ScrollRow wrapFrom={wrap ? "md" : undefined} className={"min-w-0 flex-1 items-center gap-0.5 " + (wrap ? "md:items-end" : "")}>
        <div data-testid="page-tabs" className="contents">
        {eyebrow && (
          <>
            <span className="hidden shrink-0 whitespace-nowrap py-2.5 pl-2 pr-3 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-2 md:inline">
              {eyebrow}
            </span>
            <span aria-hidden className="mr-2 hidden h-5 w-px shrink-0 self-center bg-line md:inline" />
          </>
        )}
        {tabs.map((t, i) => {
          const active = (t.match ?? t.href) === current;

          const done = sequence === "process" && t.done === true && !active;

          return (
            <div key={t.href} className="flex shrink-0 items-center">
              {}
              {numbered && i > 0 && <StepConnector />}
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={
                  "-mb-px flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap border-b-[2.5px] px-3 py-2.5 text-[14px] font-semibold transition-colors " +
                  (active
                    ? "border-magenta text-magenta"
                    : "border-transparent text-ink-2 hover:text-ink")
                }
              >
                {}
                {}
                {numbered && t.n !== undefined && (
                  <StepDisc n={t.n} state={active ? "current" : done ? "done" : "upcoming"} />
                )}
                {t.label}
                {}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-magenta px-1 text-[11px] font-bold text-white">
                    {t.badge}
                  </span>
                )}
                {}
                {t.state === "early" && (
                  <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-amber-700">
                    Early
                  </span>
                )}
              </Link>
            </div>
          );
        })}
        </div>
      </ScrollRow>
      {children && <div className="ml-auto shrink-0 pb-1 pl-3">{children}</div>}
      </div>
    </div>
  );
}
