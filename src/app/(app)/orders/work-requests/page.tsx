import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/display";
import { myWorkRequests, SOURCE_LABEL } from "@/lib/requisition";
import { WORK_REQUEST_STATUS_LABEL, workRequestStatusPillClass } from "@/lib/work-request-status";
import type { WorkRequestStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Work Requests · Panameer" };

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Incomplete", value: "INCOMPLETE" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Approved", value: "APPROVED" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Returned", value: "RETURNED" },
  { label: "Canceled", value: "CANCELLED" },
];

// JW-E008: the buyer's Work Requests (requisitions) — every Work Order comes from one.
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const viewer = await guardPage("authenticated");
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!me) redirect("/orders");
  const sp = await searchParams;
  const status = FILTERS.some((f) => f.value === sp.status) ? sp.status : "";
  const rows = await myWorkRequests(me.id, status || undefined);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <Link href="/orders" className="text-[13px] font-semibold text-ink-2 hover:text-ink">← Work Orders</Link>
      <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.5px]">My Work Requests</h1>
      <nav aria-label="Status" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link key={f.value} href={f.value ? `/orders/work-requests?status=${f.value}` : "/orders/work-requests"} aria-current={status === f.value ? "page" : undefined}
            className={status === f.value ? "inline-flex min-h-9 items-center bg-ink px-3 text-[13px] font-semibold text-surface" : "inline-flex min-h-9 items-center border border-line px-3 text-[13px] font-semibold hover:border-ink"}>
            {f.label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="mt-8 text-[14.5px] text-ink-2">No work requests{status ? " with this status" : ""} yet. Hire on a Job, or add Service Products in <Link href="/shop" className="font-semibold text-ink underline underline-offset-4">Shop</Link>.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => (
            <li key={r.id} id={r.wrNumber ?? undefined} data-wr-row className="rounded-brand border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[14px] font-bold">{r.wrNumber ?? "—"}</p>
                  <p className="mt-1 text-[15px] font-semibold">{r.description || "No description"}</p>
                  <p className="mt-1 text-[13.5px] text-ink-2">
                    {r.source ? SOURCE_LABEL[r.source] : "—"} · {r.createdAt}
                    {r.sellers.length > 0 && <> · {r.sellers.join(", ")}</>}
                    {r.jobId && <> · <Link href={`/work-requests/${r.jobId}`} className="underline underline-offset-2 hover:text-magenta">Job</Link></>}
                  </p>
                  {r.orders.length > 0 && (
                    <p className="mt-1 text-[13.5px]">
                      {r.orders.map((o, i) => <span key={o.id}>{i > 0 && " · "}<Link href={`/orders/${o.id}`} className="font-mono underline underline-offset-2 hover:text-magenta">{o.number}</Link></span>)}
                    </p>
                  )}
                  {r.status === "INCOMPLETE" && r.source === "SHOP" && <Link href="/cart" className="mt-1 inline-block text-[13.5px] font-semibold underline underline-offset-4">Open and Submit</Link>}
                </div>
                <div className="text-right">
                  <span className={workRequestStatusPillClass(r.status as WorkRequestStatus)}>{WORK_REQUEST_STATUS_LABEL[r.status as WorkRequestStatus]}</span>
                  <p className="mt-1.5 text-[15px] font-bold tabular-nums">{formatCents(r.totalCents, r.currency)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
