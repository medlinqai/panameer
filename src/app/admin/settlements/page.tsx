import { adminSettlements } from "@/lib/admin-money";
import { Listing } from "@/components/console/ConsolePage";
import { formatCents } from "@/lib/display";
import { SETTLEMENT_LABEL } from "@/lib/oracle-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment Requests · Admin · Panameer" };

const statusLabel = (s: { status: string; paidOut: boolean }) =>
  s.status === "PAID" ? (s.paidOut ? "Paid out" : "Buyer paid · payout due") : SETTLEMENT_LABEL[s.status as keyof typeof SETTLEMENT_LABEL] ?? s.status;

export default async function Page() {
  const rows = await adminSettlements();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 text-[28px] font-bold">Payment Requests</h1>
      <Listing
        title={`Payment Requests (${rows.length})`}
        columns={["Request", "Work order", "Status", "Provider", "Buyer", "Total", "Submitted", "Decided"]}
        rows={rows.map((r) => [
          r.settlementNumber, r.orderNumber, statusLabel(r), r.providerName, r.buyerName,
          formatCents(r.totalCents, r.currency), r.submittedAt ?? "—", r.decidedAt ?? "—",
        ])}
        rowMeta={rows.map((r) => ({
          text: `${r.settlementNumber} ${r.orderNumber} ${r.providerName} ${r.buyerName} ${statusLabel(r)}`.toLowerCase(),
          sort: [r.settlementNumber, r.orderNumber, statusLabel(r), r.providerName, r.buyerName, r.totalCents, r.submittedAt, r.decidedAt],
        }))}
        searchPlaceholder="Search payment requests"
        sortable
        pageSize={25}
        empty="No payment requests yet."
      />
    </div>
  );
}
