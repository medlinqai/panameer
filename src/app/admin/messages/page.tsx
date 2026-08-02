import { StubConsolePage } from "@/components/console/StubConsolePage";

/**
 * Admin → Messages (E014) — Internal Threads, a support tool rather than a
 * production surface.
 *
 * RECOLOURED, not ported wholesale: Medlinq's version leans on its teal and
 * yellow status chips, which read as a different product inside Panameer's
 * navy/magenta. The shared console template carries the palette, so this page
 * simply doesn't reintroduce them.
 */
export default function Page() {
  return (
    <StubConsolePage
      tiles={[
        { label: "Open Threads" },
        { label: "Awaiting Reply" },
        { label: "Escalated" },
        { label: "Closed This Week" },
        { label: "Median Response" },
      ]}
      listingTitle="Internal Threads"
      columns={["Participants", "Subject", "Status", "Last Message", "Assigned"]}
      what="threads"
      why="Messaging is a Medlinq port still on the backlog — /messages is a shell, and there is no thread or message model to read."
      volume={[
        { label: "Threads" },
        { label: "Messages" },
        { label: "Escalations" },
        { label: "Resolved" },
        { label: "Reopened" },
      ]}
    />
  );
}
