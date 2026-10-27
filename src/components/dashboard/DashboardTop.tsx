import Link from "next/link";
import type { Viewer } from "@/lib/access";
import { appCounts } from "@/lib/attention";
import { ActionLine } from "@/components/home/AppNav";
import { HireBand } from "@/components/hire/HireBand";
import { DealBand } from "@/components/home/DealBand";
import { countActions } from "@/lib/todo";
import { DashPies } from "@/components/dashboard/DashGlance";
import { ViewSwitch } from "@/components/dashboard/ViewSwitch";
import { txHref } from "@/lib/dashboard/tx-href";
import { BTN, BTN_MAGENTA } from "@/components/hire/HireUI";
import type { DashData } from "@/lib/dashboard/types";

// MD-E003 / NC-E003: the dashboard's top half — Welcome Back + summary + two buttons, the action line, then At a Glance.
export async function DashboardTop({ viewer, side, firstName, data, personId }: { viewer: Viewer; side: "buyer" | "provider"; firstName: string; data: DashData; personId: string }) {
  const c = await appCounts(viewer, side);
  const date = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  return (
    <section className="font-body text-ink" data-dashboard={side}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-bold tracking-[0.12em] text-magenta">{date}</p>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[32px]">Welcome Back{firstName ? `, ${firstName}` : ""}</h1>
          <div className="mt-1 text-[14px] text-ink-2" data-dash-summary>
            {data.providerNumber && <>
              Provider Number <b className="text-ink">{data.providerNumber}</b>{" "}
              <details className="relative inline-block align-middle [&_summary::-webkit-details-marker]:hidden" data-provider-number-help>
                <summary className="grid h-4 w-4 cursor-pointer list-none place-items-center rounded-full border border-ink-3 text-[10px] font-bold text-ink-2" aria-label="What is a Provider Number?">?</summary>
                <span className="absolute left-0 z-30 mt-1 block w-64 rounded-[10px] border border-line bg-white p-3 text-[12.5px] text-ink shadow-lg">What buyers see instead of your name until an Order is released. <Link href="/glossary?q=Provider%20Number" className="font-semibold underline underline-offset-2">See the Glossary of Terms →</Link></span>
              </details>
              {" · "}
            </>}
            {data.summary}
          </div>
        </div>
        <div className="flex gap-2.5">
          {/* HT-E004/E005: the main button follows the view. */}
          {side === "buyer"
            ? (data.view === "start" && !data.setupDone
              ? <><Link href={data.checklist?.find((i) => i.n === 0)?.href ?? "/company"} className={BTN_MAGENTA}>Finish Set-Up</Link><Link href="/hire" className={BTN}>Create a Job</Link></>
              : <><Link href="/hire" className={BTN_MAGENTA}>Create a Job</Link><Link href="/shop" className={BTN}>Buy Service Products</Link></>)
            : <>{data.view === "start" && !data.setupDone ? <Link href={data.checklist?.find((i) => i.n === 0)?.href ?? "/profile"} className={BTN_MAGENTA}>Complete My Profile</Link> : <Link href="/catalog" className={BTN_MAGENTA}>Add to My Catalog</Link>}<Link href="/find-work?tab=best" className={BTN}>Jobs for You</Link></>}
        </div>
      </div>

      {/* NC-E003: the Things You Need to Do panel is gone — one action line opens the Worklist. */}
      <ActionLine count={countActions(c.items, "/worklist")} />
      {/* NC-E006: the end-to-end step strip, as a thin band under the header line. */}
      <div className="mt-4">{side === "buyer" ? <HireBand personId={personId} /> : <DealBand rows={data.rows} />}</div>
      <div className="mt-6">
        <div>
          <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface">1</span>
            <h2 className="text-[20px] font-extrabold">At a Glance</h2>
            {data.view && data.viewLabels && <ViewSwitch view={data.view} labels={data.viewLabels} />}
            <Link href={txHref(side)} className="ml-auto text-[13px] font-semibold text-ink-2 hover:text-ink" data-see-all-transactions>{side === "buyer" ? "See All My Transactions →" : "See All My Work →"}</Link>
          </div>
          <div className="mt-3"><DashPies donuts={data.donuts} side={side} compact actions={c.items} /></div>
        </div>
      </div>
    </section>
  );
}
