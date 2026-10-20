import Link from "next/link";

// WT-E001: under the header — Lines · Schedule · Plan · Settlements (history and change orders live in Actions ▾).
export type OrderTab = "lines" | "schedule" | "plan" | "settlements";
export function OrderTabs({ id, current }: { id: string; current: OrderTab | null }) {
  const tabs = [
    { key: "lines", label: "Lines", href: `/orders/${id}` },
    { key: "schedule", label: "Schedule", href: `/orders/${id}?tab=schedule` },
    { key: "plan", label: "Plan", href: `/orders/${id}?tab=plan` },
    { key: "settlements", label: "Settlements", href: `/orders/${id}?tab=settlements` },
  ] as const;
  return (
    <nav aria-label="Work order" className="mt-6 flex gap-6 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={current === t.key ? "page" : undefined}
          className={current === t.key ? "-mb-px whitespace-nowrap border-b-2 border-magenta py-2.5 text-[14px] font-semibold text-ink" : "-mb-px whitespace-nowrap border-b-2 border-transparent py-2.5 text-[14px] font-semibold text-ink-2 hover:text-ink"}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
