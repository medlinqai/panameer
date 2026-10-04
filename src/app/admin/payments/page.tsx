import { openRequests, listPayments, payoutQueue, listPayouts } from "@/lib/admin-money";
import { RecordPayouts } from "@/components/admin/RecordPayouts";
import { RecordPayment } from "@/components/admin/RecordPayment";
import { Listing } from "@/components/console/ConsolePage";
import { formatCents } from "@/lib/display";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments · Admin · Panameer" };

// R1: buyer payments arrive offline (ACH/wire); record each one and allocate it to approved payment requests.
export default async function Page() {
  const [open, payments, queue, payouts] = await Promise.all([openRequests(), listPayments(), payoutQueue(), listPayouts()]);
  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-[28px] font-bold">Payments</h1>
      <p className="mb-4 mt-1 text-[14px] text-ink-2">
        {open.length} approved request{open.length === 1 ? "" : "s"} waiting on a buyer payment ·{" "}
        {formatCents(open.reduce((n, r) => n + r.remainingCents, 0))} outstanding
      </p>
      <RecordPayment open={open} />
      <RecordPayouts rows={queue} />
      <div className="mt-6">
        <Listing
          title={`Payments Received (${payments.length})`}
          columns={["Payment", "Paid by", "Received", "Amount", "Allocated", "Status", "Requests"]}
          rows={payments.map((p) => [
            p.paymentNumber,
            p.pAccountName,
            p.receivedAt,
            formatCents(p.amountCents),
            formatCents(p.allocatedCents),
            p.status.replace("_", " ").toLowerCase(),
            p.requests.join(", "),
          ])}
          rowMeta={payments.map((p) => ({
            text: `${p.paymentNumber} ${p.pAccountName} ${p.externalRef ?? ""} ${p.requests.join(" ")}`.toLowerCase(),
            sort: [p.paymentNumber, p.pAccountName, p.receivedAt, p.amountCents, p.allocatedCents, p.status, p.requests.length],
          }))}
          searchPlaceholder="Search payments"
          sortable
          pageSize={25}
          empty="No buyer payments recorded yet."
        />
      </div>
      <div className="mt-6">
        <Listing
          title={`Payouts Sent (${payouts.length})`}
          columns={["Payout", "Provider", "Paid", "Method", "Gross", "Fee", "Net"]}
          rows={payouts.map((p) => [p.payoutNumber, p.providerName, p.paidAt, p.method, formatCents(p.grossCents), formatCents(p.feeCents), formatCents(p.netCents)])}
          empty="No payouts recorded yet."
        />
      </div>
    </div>
  );
}
