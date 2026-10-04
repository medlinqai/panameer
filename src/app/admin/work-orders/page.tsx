import { adminWorkOrders } from "@/lib/admin-money";
import { Listing } from "@/components/console/ConsolePage";
import { formatCents } from "@/lib/display";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work Orders · Admin · Panameer" };

export default async function Page() {
  const rows = await adminWorkOrders();
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="mb-4 text-[28px] font-bold">Work Orders</h1>
      <Listing
        title={`Work Orders (${rows.length})`}
        columns={["Order", "Status", "Buyer", "Provider", "Account", "Value", "Approved", "Paid", "Remaining", "Created"]}
        rows={rows.map((r) => [
          r.orderNumber, r.status.toLowerCase(), r.buyerName, r.providerName, r.accountName,
          formatCents(r.valueCents, r.currency), formatCents(r.approvedCents, r.currency), formatCents(r.paidCents, r.currency),
          r.nteCents == null ? "No cap" : formatCents(r.nteCents - r.approvedCents, r.currency), r.createdAt,
        ])}
        rowMeta={rows.map((r) => ({
          text: `${r.orderNumber} ${r.buyerName} ${r.providerName} ${r.accountName} ${r.status}`.toLowerCase(),
          sort: [r.orderNumber, r.status, r.buyerName, r.providerName, r.accountName, r.valueCents, r.approvedCents, r.paidCents, r.nteCents == null ? null : r.nteCents - r.approvedCents, r.createdAt],
        }))}
        searchPlaceholder="Search work orders"
        sortable
        pageSize={25}
        empty="No work orders yet."
      />
    </div>
  );
}
