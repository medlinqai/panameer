import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Finances. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Invoices Due" },
        { label: "Payouts Pending" },
        { label: "Failed Payments" },
        { label: "Refunds" },
        { label: "Revenue (MTD)" },
      ]}
      listingTitle="Finances"
      columns={["Company", "Document", "Status", "Date", "Amount"]}
      what="financial records"
      why="Billing and settlement are not built. No invoice, payout or ledger model exists to read from."
      volume={[
        { label: "Invoices" },
        { label: "Payouts" },
        { label: "Refunds" },
        { label: "Fees" },
        { label: "Revenue" },
      ]}
    />
  );
}
