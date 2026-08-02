import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Talent. Same pattern; sourcing/placement layer not built. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Awaiting Validation" },
        { label: "Flagged Profiles" },
        { label: "New This Week" },
        { label: "Paused" },
        { label: "Placed" },
      ]}
      listingTitle="Talent"
      columns={["Provider - Company", "Headline", "Status", "Joined", "Message"]}
      what="talent records"
      why="Placement and sourcing sit on the transaction layer, which does not exist. Provider profiles themselves are on Buyers/Sellers."
      volume={[
        { label: "Providers" },
        { label: "Recruiters" },
        { label: "Placements" },
        { label: "Validations" },
        { label: "Rejections" },
      ]}
    />
  );
}
