import Link from "next/link";

// Work order tabs: Overview (the R1 page, unchanged) and Plan (Work Order Plan, R2).
export function OrderTabs({ id, current }: { id: string; current: "overview" | "plan" }) {
  const tabs = [
    { key: "overview", label: "Overview", href: `/orders/${id}` },
    { key: "plan", label: "Plan", href: `/orders/${id}?tab=plan` },
  ] as const;
  return (
    <nav aria-label="Work order" className="mt-5 flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={
            "-mb-px border-b-2 py-2.5 text-[14px] font-semibold " +
            (current === t.key ? "border-magenta text-ink" : "border-transparent text-ink-2 hover:text-ink")
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
