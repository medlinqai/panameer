import { StubConsolePage } from "@/components/console/StubConsolePage";

/** Admin → Work (E011). Transaction layer absent; every figure stubbed. */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Requests to Triage" },
        { label: "Unmatched Requests" },
        { label: "Proposals Pending" },
        { label: "Interviews Booked" },
        { label: "Orders to Approve" },
      ]}
      listingTitle="Opportunities for Work"
      columns={["Requester - Company", "Role", "Status", "Start Date", "Message"]}
      what="work requests"
      why="Work Requests, Orders, Proposals and Interviews are the transaction layer, and none of those models exist yet. This page is the shape they will land in."
      volume={[
        { label: "Work Requests" },
        { label: "Orders" },
        { label: "Invites" },
        { label: "Proposals" },
        { label: "Interviews" },
      ]}
    />
  );
}
