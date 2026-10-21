import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { appCounts } from "@/lib/attention";
import { estimateOverview } from "@/lib/app-overviews";
import { buyerEstimateEvents, sellerEstimateRequests } from "@/lib/estimate-events";
import { AppOverview } from "@/components/hire/AppOverview";
import { BTN, BTN_OUT, HeadRow, HireTabBar, RedDot, STATE_TEXT } from "@/components/hire/HireUI";
import { SliceChips } from "@/components/casing/SliceChips";
import { inSlice, sliceCounts, sliceOf } from "@/lib/slices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estimate · Panameer" };

// HB-E008: Estimate is its own app — an outcome to be priced. Buyer: ESTIMATE | Overview · Requests · Estimates In · Awarded;
// provider twin: ESTIMATE | Overview · To Price · Sent · Won. Same look as Hire.
type SP = { tab?: string; slice?: string };

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const viewer = await guardPage("authenticated");
  const sp = await searchParams;
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, is_service_provider: true } });
  if (!me) return null;
  const side = me.is_service_provider ? "seller" : "buyer";
  const n = (await appCounts(viewer, side === "buyer" ? "buyer" : "provider")).estimate.total;
  const tabs = side === "buyer"
    ? [{ key: "overview", label: "Overview", href: "/estimate", n }, { key: "requests", label: "Requests", href: "/estimate?tab=requests" }, { key: "in", label: "Estimates In", href: "/estimate?tab=in" }, { key: "awarded", label: "Awarded", href: "/estimate?tab=awarded" }]
    : [{ key: "overview", label: "Overview", href: "/estimate", n }, { key: "to-price", label: "To Price", href: "/estimate?tab=to-price" }, { key: "sent", label: "Sent", href: "/estimate?tab=sent" }, { key: "won", label: "Won", href: "/estimate?tab=won" }];
  const tab = tabs.some((t) => t.key === sp.tab) ? sp.tab! : "overview";
  return (
    <div className="pm-white-page">
      <HireTabBar eyebrow="ESTIMATE" tabs={tabs} current={tab} right={<Link href="/estimate/new" className={`${BTN} shrink-0 px-3 text-[13px] sm:px-5 sm:text-[14px]`} data-request-estimate>Request an Estimate</Link>} />
      <div className="mx-auto w-full max-w-[1120px] pb-14 pt-8">
        {tab === "overview" && <Overview viewer={viewer} personId={me.id} side={side} />}
        {side === "buyer" && (tab === "requests" || tab === "in" || tab === "awarded") && <BuyerList personId={me.id} tab={tab} slice={sp.slice} />}
        {side === "seller" && (tab === "to-price" || tab === "sent" || tab === "won") && <SellerList personId={me.id} tab={tab} slice={sp.slice} />}
      </div>
    </div>
  );
}

async function Overview({ viewer, personId, side }: { viewer: Awaited<ReturnType<typeof guardPage>>; personId: string; side: "buyer" | "seller" }) {
  const o = await estimateOverview(viewer, personId, side);
  const lower = side === "buyer" ? <BuyerLower personId={personId} /> : <SellerLower personId={personId} />;
  return <AppOverview count={o.count} summary={o.summary} groups={o.groups} band={o.band} lower={lower} />;
}

async function BuyerLower({ personId }: { personId: string }) {
  const rows = await buyerEstimateEvents(personId);
  const open = rows.filter((r) => !r.completed).slice(0, 6);
  const done = rows.filter((r) => r.completed).slice(0, 6);
  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <div className="flex flex-wrap items-center gap-3 border-b border-state-border py-3.5 sm:flex-nowrap">
      {r.needsAction ? <RedDot size={9} /> : <span className="w-[9px]" />}
      <Link href={`/estimate/${r.id}`} className="min-w-0 flex-1 text-ink hover:underline"><b className="block text-[14.5px]">{r.what}</b><span className="text-[13px] text-state-inactive">{r.number} · {r.in} of {r.asked} in{r.range ? ` · ${r.range}` : ""} · <span className={STATE_TEXT[r.completed ? "accepted" : "pending"]}>{r.step}</span></span></Link>
      <Link href={`/estimate/${r.id}`} className={`${r.needsAction ? BTN : BTN_OUT} w-full sm:w-auto`}>{r.needsAction ? "Review" : "Open"}</Link>
    </div>
  );
  return (
    <section className="flex flex-wrap items-start gap-12">
      <div className="min-w-0 flex-[999_1_560px]"><HeadRow title="My Requests" />{open.length ? open.map((r) => <Row key={r.id} r={r} />) : <p className="py-5 text-[14px] text-state-inactive">No open requests. <Link href="/estimate/new">Request an Estimate</Link> and it shows here.</p>}</div>
      <aside className="min-w-0 flex-[1_1_300px]"><HeadRow title="Awarded" />{done.length ? done.map((r) => <Row key={r.id} r={r} />) : <p className="py-5 text-[14px] text-state-inactive">Awarded estimates show here with their Work Order.</p>}</aside>
    </section>
  );
}

async function SellerLower({ personId }: { personId: string }) {
  const rows = await sellerEstimateRequests(personId);
  const open = rows.filter((r) => r.needsAction).slice(0, 6);
  const sent = rows.filter((r) => r.status === "Sent").slice(0, 6);
  const Row = ({ r }: { r: (typeof rows)[number] }) => (
    <div className="flex flex-wrap items-center gap-3 border-b border-state-border py-3.5 sm:flex-nowrap">
      {r.needsAction ? <RedDot size={9} /> : <span className="w-[9px]" />}
      <div className="min-w-0 flex-1"><b className="block text-[14.5px]">{r.what}</b><span className="text-[13px] text-state-inactive">{r.buyer}{r.due ? ` · due ${r.due}` : ""} · {r.status}</span></div>
      <Link href={r.needsAction ? `/catalog/estimates/new?request=${r.id}${r.estimateId ? `&id=${r.estimateId}` : ""}` : `/estimates/requests/${r.id}`} className={`${r.needsAction ? BTN : BTN_OUT} w-full sm:w-auto`}>{r.needsAction ? "Price It" : "Open"}</Link>
    </div>
  );
  return (
    <section className="flex flex-wrap items-start gap-12">
      <div className="min-w-0 flex-[999_1_560px]"><HeadRow title="To Price" />{open.length ? open.map((r) => <Row key={r.id} r={r} />) : <p className="py-5 text-[14px] text-state-inactive">Nothing to price. Requests for estimates show here.</p>}</div>
      <aside className="min-w-0 flex-[1_1_300px]"><HeadRow title="Sent" />{sent.length ? sent.map((r) => <Row key={r.id} r={r} />) : <p className="py-5 text-[14px] text-state-inactive">Estimates you send show here.</p>}</aside>
    </section>
  );
}

async function BuyerList({ personId, tab, slice }: { personId: string; tab: string; slice?: string }) {
  const all = await buyerEstimateEvents(personId);
  const scoped = tab === "in" ? all.filter((r) => r.in > 0 && !r.completed) : tab === "awarded" ? all.filter((r) => r.step === "Award" || r.step === "Work Order Created") : all;
  const rows = scoped.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[30px] font-extrabold">{tab === "in" ? "Estimates In" : tab === "awarded" ? "Awarded" : "Requests"}</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey={`estimate-${tab}`} counts={sliceCounts(scoped)} base={`/estimate?tab=${tab}`} /></div>
      {rows.length ? rows.map((r) => (
        <article key={r.id} className="flex flex-wrap items-start gap-4 border-b border-state-border pb-5 sm:flex-nowrap">
          {r.needsAction ? <RedDot size={9} /> : <span className="w-[9px]" />}
          <div className="min-w-0 flex-1"><Link href={`/estimate/${r.id}`} className="text-[17px] font-bold text-ink hover:underline">{r.what}</Link><div className="mt-1 text-[13px] text-state-inactive">{r.number} · {r.in} of {r.asked} in{r.range ? ` · ${r.range}` : ""} · due {r.due} · <span className={STATE_TEXT[r.completed ? "accepted" : "pending"]}>{r.step}</span></div></div>
          <Link href={`/estimate/${r.id}`} className={`${r.needsAction ? BTN : BTN_OUT} w-full sm:w-auto`}>{r.needsAction ? "Review estimates" : "Open"}</Link>
        </article>
      )) : <p className="text-[14px] text-state-inactive">Nothing here yet.</p>}
    </div>
  );
}

async function SellerList({ personId, tab, slice }: { personId: string; tab: string; slice?: string }) {
  const all = await sellerEstimateRequests(personId);
  const won = tab === "won" ? new Set((await prisma.estimate.findMany({ where: { provider_person_id: personId, status: "ACCEPTED" }, select: { id: true } })).map((e) => e.id)) : null;
  const scoped = tab === "to-price" ? all.filter((r) => r.status === "To price") : tab === "sent" ? all.filter((r) => r.status === "Sent") : all.filter((r) => r.estimateId && won!.has(r.estimateId));
  const rows = scoped.filter((r) => inSlice(r, sliceOf(slice)));
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[30px] font-extrabold">{tab === "to-price" ? "To Price" : tab === "sent" ? "Sent" : "Won"}</h1>
      <div className="border-b border-ink pb-3"><SliceChips tabKey={`estimate-${tab}`} counts={sliceCounts(scoped)} base={`/estimate?tab=${tab}`} /></div>
      {rows.length ? rows.map((r) => (
        <article key={r.id} className="flex flex-wrap items-start gap-4 border-b border-state-border pb-5 sm:flex-nowrap">
          {r.needsAction ? <RedDot size={9} /> : <span className="w-[9px]" />}
          <div className="min-w-0 flex-1"><b className="text-[17px]">{r.what}</b><div className="mt-1 text-[13px] text-state-inactive">{r.buyer}{r.jobTitle ? ` · ${r.jobTitle}` : ""}{r.due ? ` · due ${r.due}` : ""} · {r.status}</div></div>
          <span className="flex w-full gap-2 sm:w-auto">
            {r.needsAction && <Link href={`/catalog/estimates/new?request=${r.id}${r.estimateId ? `&id=${r.estimateId}` : ""}`} className={`${BTN} flex-1 sm:flex-none`}>{r.estimateId ? "Revise" : "Price It"}</Link>}
            <Link href={`/estimates/requests/${r.id}`} className={`${BTN_OUT} flex-1 sm:flex-none`}>{r.needsAction ? "Decline" : "Open"}</Link>
          </span>
        </article>
      )) : <p className="text-[14px] text-state-inactive">Nothing here yet.</p>}
    </div>
  );
}
