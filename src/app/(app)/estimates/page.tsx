import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { estimatesPage, type EstimateListRow } from "@/lib/estimate-requests";
import { formatCents } from "@/lib/display";
import { PageTabs } from "@/components/casing/PageTabs";
import { WithdrawRequest } from "@/components/catalog/WithdrawRequest";

export const metadata = { title: "Cost Estimates · Panameer" };
export const dynamic = "force-dynamic";

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

// EST-E003: My › Cost Estimates — Received (buyer) and Sent (provider). Private to the two parties of each.
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await guardPage("authenticated");
  const { tab: raw } = await searchParams;
  const d = await estimatesPage(viewer);
  const tab = raw === "sent" || raw === "received" ? raw : d.received.length === 0 && (d.sent.length || d.waiting.length) ? "sent" : "received";
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <h1 className="text-[28px] font-bold">Cost Estimates</h1>
      <p className="mt-1 text-[14px] text-ink-2">Quotes for one customer, private to the two of you.</p>
      <PageTabs className="mt-4" current={tab} tabs={[{ label: `Received${d.received.length ? ` (${d.received.length})` : ""}`, href: "/estimates?tab=received", match: "received" }, { label: `Sent${d.sent.length + d.waiting.length ? ` (${d.sent.length + d.waiting.length})` : ""}`, href: "/estimates?tab=sent", match: "sent" }]} />
      {tab === "received" ? (
        d.received.length ? <Rows rows={d.received} withdraw /> : <p className="text-[14px] text-ink-2">Nothing yet. Ask a provider from their profile or a service: <b>Request an Estimate</b>.</p>
      ) : (
        <>
          {d.waiting.length > 0 && (
            <section data-requests-waiting className="mb-6">
              <h2 className="mb-2 text-[17px] font-bold">Requests Waiting on Me <small className="ml-1 text-[12px] font-medium text-ink-3">{d.waiting.length}</small></h2>
              <Rows rows={d.waiting} />
            </section>
          )}
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-bold">Estimates</h2>
            <Link href="/catalog/estimates/new" className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">+ Create</Link>
          </div>
          {d.sent.length ? <Rows rows={d.sent} /> : <p className="text-[14px] text-ink-2">No estimates yet.</p>}
        </>
      )}
    </main>
  );
}
