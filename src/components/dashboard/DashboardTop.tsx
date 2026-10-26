import Link from "next/link";
import type { Viewer } from "@/lib/access";
import { appCounts } from "@/lib/attention";
import { AttentionList } from "@/components/home/AttentionList";
import { DashPies, txHref } from "@/components/dashboard/DashGlance";
import { BTN, BTN_MAGENTA } from "@/components/hire/HireUI";
import type { DashData } from "@/lib/dashboard/types";

// MD-E003 / JR-E009: the dashboard's top half — Welcome Back + summary + two buttons, then At a Glance beside Things You Need to Do.
export async function DashboardTop({ viewer, side, firstName, data }: { viewer: Viewer; side: "buyer" | "provider"; firstName: string; data: DashData }) {
  const c = await appCounts(viewer, side);
  const date = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <section className="font-body text-ink" data-dashboard={side}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">{date}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[32px]">Welcome Back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-1 text-[14px] text-ink-2" data-dash-summary>{data.summary}</p>
        </div>
        <div className="flex gap-2.5">
          {side === "buyer"
            ? <><Link href="/hire" className={BTN_MAGENTA}>Create a Job</Link><Link href="/shop" className={BTN}>Buy Service Products</Link></>
            : <><Link href="/catalog" className={BTN_MAGENTA}>Add to My Catalog</Link><Link href="/find-work?tab=best" className={BTN}>Jobs for You</Link></>}
        </div>
      </div>

      {/* JR-E009: one screen — 1 · At a Glance (2×2 pies) beside ! Things You Need to Do; the table lives on My Transactions. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface">1</span>
            <h2 className="text-[20px] font-extrabold">At a Glance</h2>
            <Link href={txHref(side)} className="ml-auto text-[13px] font-semibold text-ink-2 hover:text-ink" data-see-all-transactions>{side === "buyer" ? "See All My Transactions →" : "See All My Work →"}</Link>
          </div>
          <div className="mt-3"><DashPies donuts={data.donuts} side={side} size={64} cols="sm:grid-cols-2" /></div>
        </div>
        <div>
          <div className="flex items-baseline gap-3 border-b border-ink pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-state-declined text-[13px] font-bold text-surface">!</span>
            <h2 className="text-[20px] font-extrabold">Things You Need to Do</h2>
          </div>
          <div className="mt-2">{c.items.length ? <AttentionList items={c.items} /> : <p className="py-3 text-[14px] text-ink-3">Nothing is waiting on you right now.</p>}</div>
        </div>
      </div>
    </section>
  );
}
