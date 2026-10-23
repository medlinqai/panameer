import Link from "next/link";
import type { ReactNode } from "react";
import { ActGroups, type ActGroup } from "@/components/hire/ActGroups";
import { PathBand, type BandStep } from "@/components/hire/HireUI";

// SE-E001–E004: the Hire Overview layout for any app — date eyebrow, "{n} things need you today", one summary line,
// the Orders link, grouped act-and-clear rows, the thin path band, then the two-column lists.
export function AppOverview({ count, summary, groups, band, lower, intro }: { count: number; summary: string; groups: ActGroup[]; band: { key: string; label: string; count: number; href: string; needs?: boolean }[]; lower?: ReactNode; intro?: ReactNode }) {
  const firstNeed = band.findIndex((b) => b.needs && b.count > 0);
  const lastBusy = Math.max(-1, ...band.map((b, i) => (b.count > 0 && i < band.length - 1 ? i : -1)));
  const active = firstNeed >= 0 ? firstNeed : lastBusy;
  const steps: BandStep[] = band.map((b, i) => ({
    key: b.key, label: b.label.includes("Orders →") ? <>{b.label.replace(" · Orders →", "")} · <span className="text-magenta-dark">Orders →</span></> : b.label, href: b.href,
    current: i === active, needs: !!b.needs && b.count > 0, muted: !b.count && i !== active, bar: i <= active ? "done" : "todo",
    top: <span className={`text-[22px] font-extrabold ${b.count ? (i === active ? "text-magenta" : "text-ink") : "text-state-border"}`}>{b.count}</span>,
  }));
  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-wrap items-start gap-10" data-app-today>
        <div className="min-w-0 flex-[1_1_300px]">
          <span className="text-[12px] font-bold tracking-[0.12em] text-magenta">{dateLabel}</span>
          <h1 className="mb-2.5 mt-2 text-[28px] font-extrabold leading-[1.15] sm:text-[34px]">{count ? `${count} ${count === 1 ? "Thing Needs" : "Things Need"} Attention` : "Nothing Needs Attention"}</h1>
          <p className="text-[14px] leading-[1.7] text-state-inactive">{summary}</p>
          <p className="mt-[18px] text-[13px] leading-relaxed text-state-inactive">Order tasks are in <Link href="/orders/overview">Orders</Link>.</p>
          {intro}
        </div>
        <ActGroups groups={groups} />
      </section>
      <PathBand steps={steps} />
      {lower}
    </div>
  );
}
