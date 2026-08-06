import Link from "next/link";

/**
 * The tab row a flattened rail item's children become (E216).
 *
 * WHY THIS EXISTS. The six Transaction rail items each carried a hover flyout
 * of children, and the Find Work flyout was the clearest sign it was the wrong
 * shape: its five entries were the Find Work page's own tab row, listed a
 * second time in a menu. Two controls for one set of views, one of which you
 * had to discover by hovering.
 *
 * So the children come DOWN onto the page they belong to. A tab row is visible
 * on arrival, says where you are as well as where you can go, survives a
 * bookmark, and cannot be clipped by the rail — which the flyouts were, until
 * they had to be portalled out.
 *
 * SERVER COMPONENT, LINKS NOT BUTTONS. Every one of these views is a distinct
 * URL, so they are navigations; making them client-side state would cost the
 * back button and the ability to link someone to "my proposals".
 */
export type PageTab = {
  label: string;
  href: string;
  /** Matched against the current path+query to pick the active tab. */
  match?: string;
};

export function PageTabs({
  tabs,
  current,
  className = "",
  children,
}: {
  tabs: PageTab[];
  /** The active tab's `match` (or href). Resolved by the page, which knows its
   *  own query string; this component stays free of client hooks. */
  current: string;
  className?: string;
  /** Trailing controls — a Filters button, a count. Sits after the tabs. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={
        "-mx-1 mb-4 flex items-center gap-1 overflow-x-auto border-b border-line px-1 " +
        className
      }
    >
      {tabs.map((t) => {
        const active = (t.match ?? t.href) === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[14px] font-semibold transition-colors " +
              (active
                ? "border-magenta text-magenta"
                : "border-transparent text-ink-2 hover:text-ink")
            }
          >
            {t.label}
          </Link>
        );
      })}
      {children && <div className="ml-auto shrink-0 pb-1 pl-3">{children}</div>}
    </div>
  );
}
