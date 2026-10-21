import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ordersToday } from "@/lib/live-work";
import { BTN_OUT, HireTabBar, PathBand, RedDot, type BandStep } from "@/components/hire/HireUI";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders · Panameer" };

// HB-E006: ORDERS › Overview — Work Order tasks (accept, change orders, deliveries), same layout as Hire's Overview.
export default async function Page() {
  const viewer = await guardPage("authenticated");
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) return null;
  const t = await ordersToday(me.id);
  const n = t.items.length;
  const tabs = [
    { key: "overview", label: "Overview", href: "/orders/overview", n },
    { key: "orders", label: "Work Orders", href: "/orders" },
    { key: "requests", label: "Work Requests", href: "/orders/work-requests" },
  ];
  const firstBusy = t.band.findIndex((b) => b.count > 0);
  const band: BandStep[] = t.band.map((b, k) => ({ key: b.key, label: b.label, href: "/orders", current: k === firstBusy, muted: !b.count, bar: firstBusy >= 0 && k <= firstBusy ? "done" : "todo", needs: b.count > 0 && (b.key === "buyer" || b.key === "provider") && n > 0, top: <span className={`text-[22px] font-extrabold ${b.count ? (k === firstBusy ? "text-magenta" : "text-ink") : "text-state-border"}`}>{b.count}</span> }));
  const dateLabel = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <div className="pm-white-page">
      <HireTabBar eyebrow="ORDERS" tabs={tabs} current="overview" />
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 pb-14 pt-8">
        <section className="flex flex-wrap items-start gap-10" data-orders-today>
          <div className="min-w-0 flex-[1_1_300px]">
            <span className="text-[12px] font-bold tracking-[0.12em] text-magenta">{dateLabel}</span>
            <h1 className="mb-2.5 mt-2 text-[28px] font-extrabold leading-[1.15] sm:text-[34px]">{n ? `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} you today` : "Nothing needs you today"}</h1>
            <p className="text-[14px] leading-relaxed text-state-inactive">{t.open} open Work Order{t.open === 1 ? "" : "s"} · <Link href="/orders" className="font-semibold">All Work Orders →</Link></p>
          </div>
          <div className="flex min-w-0 flex-[1_1_520px] flex-col border-b border-state-border">
            {n ? t.items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-3.5 border-t border-state-border py-4 sm:flex-nowrap" data-orders-item>
                <RedDot />
                <div className="min-w-0 flex-1"><div className="text-[15px] font-bold">{it.what}</div><div className="text-[13px] text-state-inactive">{it.detail}</div></div>
                <Link href={it.href} className={`${BTN_OUT} w-full sm:w-auto`}>{it.action}</Link>
              </div>
            )) : <p className="border-t border-state-border py-4 text-[14px] text-state-inactive">None waiting. Work Orders to accept, change orders and deliveries to approve show here.</p>}
          </div>
        </section>
        <PathBand steps={band} label="Work Order path" />
      </div>
    </div>
  );
}
