import { offersForBuyer, openOffersForSeller } from "@/lib/service-product-offers";
import { OffersList } from "@/components/catalog/OffersList";
import Link from "next/link";
import type { Viewer } from "@/lib/access";
import { estimatesPage, type EstimateListRow } from "@/lib/estimate-requests";
import { formatCents } from "@/lib/display";
import { WithdrawRequest } from "@/components/catalog/WithdrawRequest";


const LABEL: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", CHANGES_REQUESTED: "Changes Requested", ACCEPTED: "Accepted", DECLINED: "Declined", EXPIRED: "Expired",
  REQUEST_OPEN: "Requested", REQUEST_ANSWERED: "Answered", REQUEST_DECLINED: "Request Declined", REQUEST_WITHDRAWN: "Withdrawn",
};
const WAIT = new Set(["SENT", "CHANGES_REQUESTED", "REQUEST_OPEN"]);
const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Rows({ rows, withdraw = false }: { rows: EstimateListRow[]; withdraw?: boolean }) {
  return (
    <ul className="border-t border-line">
      {rows.map((r) => (
        <li key={`${r.kind}-${r.id}`} data-estimate-row={r.kind} className="flex items-center gap-3 border-b border-line py-3">
          <Link href={r.href} className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 hover:opacity-80">
            <span className="min-w-0">
              <b className="block truncate text-[14.5px]">{r.title}</b>
              <span className="block truncate text-[12.5px] text-ink-2">{r.number} · {r.other} · {day(r.updated)}</span>
            </span>
            <span className="text-right">
              {r.totalCents != null && <b className="block text-[14px] tabular-nums">{formatCents(r.totalCents, "USD")}</b>}
              <span className={"inline-block border px-2 py-0.5 text-[11px] font-bold " + (WAIT.has(r.status) ? "border-magenta text-magenta-dark" : r.status === "ACCEPTED" ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>{LABEL[r.status] ?? r.status}</span>
            </span>
          </Link>
          {withdraw && r.status === "REQUEST_OPEN" && <WithdrawRequest id={r.id} />}
        </li>
      ))}
    </ul>
  );
}

// Scott 2026-10-12: one side per page. Catalog › Estimates = the seller's (requests waiting on you + estimates you sent);
// My Estimates (Shop / My menu) = the buyer's (estimates and requests you've received or made). Private to the two parties of each.
export async function EstimatesBody({ viewer, side, tabs, seller = false }: { viewer: Viewer; side: "seller" | "buyer"; tabs: React.ReactNode; seller?: boolean }) {
  const [d, offers] = await Promise.all([estimatesPage(viewer), side === "seller" ? openOffersForSeller(viewer).catch(() => []) : offersForBuyer(viewer).catch(() => [])]);
  if (side === "seller") {
    return (
      <div className="pm-white-page mx-auto w-full max-w-5xl" data-estimates-side="seller">
        {tabs}
        <h1 className="mt-1 text-[28px] font-bold">Estimates</h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2">Quotes you send to one customer, private to the two of you.</p>
          <Link href="/catalog/estimates/new" data-create-estimate className="inline-flex min-h-10 shrink-0 items-center bg-ink px-4 text-[13.5px] font-semibold text-surface hover:bg-ink-hover">Create an Estimate</Link>
        </div>
        <section id="offers" data-offers-waiting className="mt-6 scroll-mt-24">
          <h2 className="mb-2 text-[17px] font-bold">Offers Waiting on You{offers.length > 0 && <small className="ml-1.5 text-[12px] font-medium text-ink-3">{offers.length}</small>}</h2>
          <OffersList offers={offers} side="seller" />
        </section>
        <section data-requests-waiting className="mt-8">
          <h2 className="mb-2 text-[17px] font-bold">Requests Waiting on You{d.waiting.length > 0 && <small className="ml-1.5 text-[12px] font-medium text-ink-3">{d.waiting.length}</small>}</h2>
          {d.waiting.length ? <Rows rows={d.waiting} /> : <p className="border-t border-line pt-3 text-[14px] text-ink-2">No requests right now. Buyers ask from your profile, your services and your Service Products.</p>}
        </section>
        <section data-estimates-sent className="mt-8">
          <h2 className="mb-2 text-[17px] font-bold">Sent Estimates{d.sent.length > 0 && <small className="ml-1.5 text-[12px] font-medium text-ink-3">{d.sent.length}</small>}</h2>
          {d.sent.length ? <Rows rows={d.sent} /> : <p className="border-t border-line pt-3 text-[14px] text-ink-2">None yet.</p>}
        </section>
      </div>
    );
  }
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl" data-estimates-side="buyer">
      {tabs}
      <h1 className="mt-1 text-[28px] font-bold">My Estimates</h1>
      <p className="mt-1 text-[14px] text-ink-2">Estimates providers have sent you, and the ones you've asked for.</p>
      <div className="mt-6">
        {d.received.length ? <Rows rows={d.received} withdraw /> : <p className="border-t border-line pt-3 text-[14px] text-ink-2">Nothing yet. Ask a provider from their profile or a service: <b>Request an Estimate</b>.</p>}
      </div>
      <section id="offers" data-my-offers className="mt-8 scroll-mt-24">
        <h2 className="mb-2 text-[17px] font-bold">My Offers{offers.length > 0 && <small className="ml-1.5 text-[12px] font-medium text-ink-3">{offers.length}</small>}</h2>
        <OffersList offers={offers} side="buyer" />
      </section>
      {seller && <p className="mt-6 text-[13.5px] text-ink-2">Estimates you send to customers are in <Link href="/catalog/estimates" className="font-bold text-magenta-dark underline underline-offset-4">Catalog › Estimates</Link>.</p>}
    </div>
  );
}
