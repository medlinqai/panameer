import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Community. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Posts to Moderate" },
        { label: "Reported" },
        { label: "New Members" },
        { label: "Active Threads" },
        { label: "Banned" },
      ]}
      listingTitle="Community"
      columns={["Member - Company", "Post", "Status", "Posted Date", "Message"]}
      what="community activity"
      why="The community feature has not been built; there is no posting or membership model behind this page yet."
      volume={[
        { label: "Members" },
        { label: "Posts" },
        { label: "Threads" },
        { label: "Reports" },
        { label: "Removals" },
      ]}
    />
  );
}
