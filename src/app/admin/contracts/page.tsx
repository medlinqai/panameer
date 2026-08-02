import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Contracts. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Awaiting Signature" },
        { label: "In Dispute" },
        { label: "Expiring" },
        { label: "Amended" },
        { label: "Completed" },
      ]}
      listingTitle="Contracts"
      columns={["Parties", "Contract", "Status", "Start Date", "Message"]}
      what="contracts"
      why="Contracts are produced by the ordering flow, which is part of the transaction layer and not built."
      volume={[
        { label: "Contracts" },
        { label: "Amendments" },
        { label: "Disputes" },
        { label: "Completions" },
        { label: "Value" },
      ]}
    />
  );
}
