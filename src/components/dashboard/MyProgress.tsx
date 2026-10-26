import Link from "next/link";
import { buyerMetrics, groupMarkers, moneyExtras, periodRange, productDemand, sellerMetrics, serviceDemand, type DemandRow, type PeriodKey } from "@/lib/dashboard/progress";
import { PeriodSelect } from "@/components/dashboard/PeriodSelect";
import { prisma } from "@/lib/prisma";

// MD-E004: 2 · My Progress — dark bar = you, magenta marker = the group (or the Panameer Target while the group is under 20).
type Stage = [label: string, key: string];
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function Tile({ app, title, period, children, foot, footHref, group }: { app: string; title: string; period: string; children: React.ReactNode; foot: string; footHref: string; group?: string }) {
  return (
    <div className="flex flex-col rounded-[12px] border border-line bg-white p-4" data-progress-tile={title}>
      <p className="text-[10.5px] font-bold tracking-[0.12em] text-ink-3">{app}</p>
      <h4 className="mt-0.5 text-[15px] font-extrabold">{title}<span className="ml-1.5 text-[11.5px] font-medium text-ink-3">{period}</span></h4>
      <div className="mt-2 flex-1">{children}</div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[12.5px]">
        <Link href={footHref} className="font-semibold">{foot} →</Link>
        {group && <span className="text-[11px] text-ink-3">{group}</span>}
      </div>
    </div>
  );
}

function Funnel({ stages, you, grp }: { stages: Stage[]; you: Record<string, number>; grp: Record<string, number> }) {
  const max = Math.max(1, ...stages.flatMap(([, k]) => [you[k] ?? 0, grp[k] ?? 0]));
  const [lastLabel, lastKey] = stages[stages.length - 1];
  const y = you[lastKey] ?? 0, g = grp[lastKey] ?? 0;
  const diff = Math.round((g - y) * 10) / 10;
  const good = y >= g;
  return (
    <>
      <div className="grid grid-cols-[1fr_44px_44px] gap-x-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-3"><span /><span className="text-right">You</span><span className="text-right">Group</span></div>
      {stages.map(([label, k]) => (
        <div key={k} className="mt-1.5" data-funnel-stage={k}>
          <div className="grid grid-cols-[1fr_44px_44px] items-baseline gap-x-2 text-[12.5px]"><span className="truncate text-ink-2">{label}</span><b className="text-right tabular-nums">{you[k] ?? 0}</b><em className="text-right not-italic tabular-nums text-ink-3">{grp[k] ?? 0}</em></div>
          <div className="relative mt-0.5 h-2 rounded-full bg-state-sunken">
            <span className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${Math.max(2, ((you[k] ?? 0) / max) * 100)}%` }} />
            <span className="absolute -top-0.5 h-3 w-[3px] rounded-sm bg-magenta" style={{ left: `calc(${((grp[k] ?? 0) / max) * 100}% - 1px)` }} />
          </div>
        </div>
      ))}
      <p className={`mt-2.5 text-[12.5px] font-semibold ${good ? "text-state-accepted" : "text-state-pending"}`} data-read>{good ? `▲ At or above the group on ${lastLabel}` : `▼ ${diff} ${lastLabel} behind the group`}</p>
    </>
  );
}

function Demand({ rows, empty }: { rows: DemandRow[]; empty: string }) {
  const high = rows.filter((r) => r.level === "High").length;
  return (
    <>
      {rows.length ? (
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-[12.5px]">
          <span className="text-[10.5px] font-bold uppercase text-ink-3">What You Offer</span><span className="text-[10.5px] font-bold uppercase text-ink-3">Asked For</span><span className="text-[10.5px] font-bold uppercase text-ink-3">Demand</span>
          {rows.map((r) => (
            <span key={r.name} className="contents">
              <span className="truncate">{r.name}</span><b className="text-right tabular-nums">{r.asks}</b>
              <span className={`rounded-full px-2 text-center text-[11px] font-bold ${r.level === "High" ? "bg-state-accepted-bg text-state-accepted" : r.level === "Medium" ? "bg-state-pending-bg text-state-pending" : "bg-state-inactive-bg text-state-inactive"}`}>{r.level}</span>
            </span>
          ))}
        </div>
      ) : <p className="text-[13px] text-ink-3">{empty}</p>}
      {rows.length > 0 && <p className="mt-2.5 text-[12.5px] font-semibold text-ink-2" data-read>{high} of your {rows.length} {high === 1 ? "is" : "are"} in high demand</p>}
    </>
  );
}

function Money({ you, grp, rows }: { you: number; grp: number; rows: [string, number][] }) {
  const max = Math.max(1, you, grp);
  return (
    <>
      <p className="text-[26px] font-extrabold">{usd(you)}</p>
      {[["You", you, "bg-ink"], ["Group", grp, "bg-magenta"]].map(([l, v, c]) => (
        <div key={l as string} className="mt-1 grid grid-cols-[52px_1fr_auto] items-center gap-2 text-[12px]"><span className="text-ink-2">{l}</span><span className="h-2 rounded-full bg-state-sunken"><span className={`block h-2 rounded-full ${c}`} style={{ width: `${((v as number) / max) * 100}%` }} /></span><b className="tabular-nums">{usd(v as number)}</b></div>
      ))}
      <p className={`mt-2 text-[12.5px] font-semibold ${you >= grp ? "text-state-accepted" : "text-state-pending"}`}>{you >= grp ? "▲ At or above the group" : "▼ Below the group"}</p>
      <div className="mt-2 space-y-0.5 text-[12.5px]">{rows.map(([l, v]) => <div key={l} className="flex justify-between"><span className="text-ink-2">{l}</span><b className="tabular-nums">{usd(v / 100)}</b></div>)}</div>
    </>
  );
}

export async function MyProgress({ side, personId, period }: { side: "buyer" | "provider"; personId: string; period: PeriodKey }) {
  const { from, to } = periodRange(period);
  const role = side === "buyer" ? "BUYER" : "SELLER";
  const [youMap, group, extras] = await Promise.all([
    side === "buyer" ? buyerMetrics([personId], from, to) : sellerMetrics([personId], from, to),
    groupMarkers(role, from, to),
    moneyExtras(personId, role, from, to),
  ]);
  const you = youMap.get(personId) ?? {};
  const g = group.values;
  const label = period === "quarter" ? "This Quarter" : period === "90d" ? "Last 90 Days" : "This Year";
  const foot = group.usesTarget ? "Target" : side === "buyer" ? `Group: ${group.size} active buyers` : `Group: ${group.size} sellers earning`;
  return (
    <section className="mt-12" data-my-progress>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2">
        <div className="flex items-baseline gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface">2</span>
          <div><h2 className="text-[20px] font-extrabold">My Progress</h2><p className="text-[13px] text-ink-3">{side === "buyer" ? "You, against buyers getting work done on Panameer" : "You, against sellers earning on Panameer"} {label.toLowerCase()}</p></div>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-4 rounded-full bg-ink" />You</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-3 w-[3px] bg-magenta" />{group.usesTarget ? "Panameer Target" : "Group Average"}</span>
          <PeriodSelect value={period} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {side === "provider" ? (
          <>
            <Tile app="CONNECT" title="Connections" period={label} foot="Find People" footHref="/connect/community" group={foot}><Funnel you={you} grp={g} stages={[["Invited", "seller.connect.invited"], ["Connected", "seller.connect.connected"], ["Mentoring", "seller.connect.mentoring"], ["Introduced You", "seller.connect.introduced"]]} /></Tile>
            <Tile app="LEARN" title="Courses" period="All Time" foot="Take a Test" footHref="/learn" group={foot}><Funnel you={you} grp={g} stages={[["Published", "seller.courses.published"], ["Matched to You", "seller.courses.matched"], ["Enrolled", "seller.courses.enrolled"], ["Taken", "seller.courses.taken"], ["Certified", "seller.courses.certified"]]} /></Tile>
            <Tile app="SELL" title="Services" period="Last 30 Days" foot="Jobs for You" footHref="/find-work?tab=best"><Demand rows={await serviceDemand(personId)} empty="List a service to see its demand." /></Tile>
            <Tile app="SELL" title="Service Products" period="Last 30 Days" foot="My Catalog" footHref="/catalog/products"><Demand rows={await productDemand(personId)} empty="List a service product to see its demand." /></Tile>
            <Tile app="ORDERS" title="Orders" period={label} foot="See Orders" footHref="/orders" group={foot}><Funnel you={you} grp={g} stages={[["Offered", "seller.orders.offered"], ["Accepted", "seller.orders.accepted"], ["Delivered", "seller.orders.delivered"], ["On Time", "seller.orders.on_time"]]} /></Tile>
            <Tile app="PAYMENTS" title="Earned" period={label} foot="See Payments" footHref="/payments" group={foot}><Money you={you["seller.payments.earned"] ?? 0} grp={g["seller.payments.earned"] ?? 0} rows={[["Billed, Not Yet Paid", extras.a], ["Paid to You", extras.b]]} /></Tile>
          </>
        ) : (
          <>
            <Tile app="CONNECT" title="Connections" period={label} foot="Find People" footHref="/connect/community" group={foot}><Funnel you={you} grp={g} stages={[["Invited", "buyer.connect.invited"], ["Connected", "buyer.connect.connected"], ["Mentors", "buyer.connect.mentors"]]} /></Tile>
            <Tile app="HIRE" title="Jobs" period={label} foot="Create a Job" footHref="/hire" group={foot}><Funnel you={you} grp={g} stages={[["Published", "buyer.jobs.published"], ["Availability Requested", "buyer.jobs.availability"], ["Interviewed", "buyer.jobs.interviewed"], ["Filled", "buyer.jobs.hired"]]} /></Tile>
            <Tile app="SHOP" title="Shop" period={label} foot="Shop" footHref="/shop" group={foot}><Funnel you={you} grp={g} stages={[["Viewed", "buyer.shop.viewed"], ["Ordered", "buyer.shop.ordered"], ["Delivered", "buyer.shop.delivered"]]} /><p className="mt-1 text-[12px] text-ink-3">{(await prisma.serviceProduct.count({ where: { status: "PUBLISHED" } })).toLocaleString("en-US")} products offered</p></Tile>
            <Tile app="ORDERS" title="Orders" period={label} foot="See Orders" footHref="/orders" group={foot}><Funnel you={you} grp={g} stages={[["Created", "buyer.orders.created"], ["Active", "buyer.orders.active"], ["Approved Delivery", "buyer.orders.approved"], ["On Time", "buyer.orders.on_time"]]} /></Tile>
            <Tile app="PAYMENTS" title="Paid" period={label} foot="See Payments" footHref="/payments" group={foot}><Money you={you["buyer.payments.paid"] ?? 0} grp={g["buyer.payments.paid"] ?? 0} rows={[["Invoices to Approve", extras.a], ["Savings on Hires", extras.b]]} /></Tile>
          </>
        )}
      </div>
    </section>
  );
}
