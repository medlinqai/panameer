import Link from "next/link";
import { formatCents } from "@/lib/display";
import type { SettlementRow } from "@/lib/settlements";
import type { SettlementStatus } from "@prisma/client";

/**
 * The settlement list row and its status pill, shared by the provider's list and
 * the buyer's queue (`P1-J4-E394`).
 *
 * ⚠ ONE DEFINITION so the two sides cannot describe the same payment request two
 * ways — the same reasoning `OrderChrome` and `SettingsNav` share one.
 */

const TONE: Record<SettlementStatus, string> = {
  DRAFT: "bg-ink/[0.05] text-ink-2",
  SUBMITTED: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-rose-50 text-rose-700",
  PAID: "bg-emerald-50 text-emerald-700",
};
const LABEL: Record<SettlementStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Sent back",
  PAID: "Paid",
};

export function SettlementStatusPill({ status }: { status: SettlementStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${TONE[status]}`}>
      {LABEL[status]}
    </span>
  );
}

export function SettlementRowCard({ row }: { row: SettlementRow }) {
  return (
    <li className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/finances/payment-requests/${row.id}`}
            className="font-mono text-[15px] font-bold hover:text-magenta"
          >
            {row.settlementNumber}
          </Link>
          <p className="mt-1 text-[14.5px]">
            {/* ⚠ THE ROW NAMES THE OTHER SIDE and says which side that is — one
                page can show both, so "Acme" alone would be ambiguous. */}
            <span className="text-ink-2">{row.party === "BUYER" ? "From: " : "To: "}</span>
            <span className="font-semibold">{row.counterpartyName}</span>
          </p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {row.periodStart} → {row.periodEnd} · {row.lineCount} line
            {row.lineCount === 1 ? "" : "s"} ·{" "}
            <Link
              href={`/orders/${row.orderId}`}
              className="underline underline-offset-2 hover:text-magenta"
            >
              {row.orderNumber}
            </Link>
          </p>
        </div>
        <div className="text-right">
          <SettlementStatusPill status={row.status} />
          <p className="mt-1.5 text-[15px] font-bold">
            {formatCents(row.totalCents, row.currency)}
          </p>
        </div>
      </div>
    </li>
  );
}
