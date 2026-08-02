import { TileRow, Listing, StubEmpty } from "@/components/console/ConsolePage";

/**
 * Admin → Support Center (deck slide 15 / image9): the Open Bugs queue.
 *
 * Four tiles — Open / Past Due / Resolved (MTD) / Unassigned — over a bug
 * table. All stubbed: the bug-report button shipped earlier deliberately files
 * nothing (there is no ticket model), so a queue of them would be inventing the
 * very records that button refuses to fake.
 */
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Open", hint: "Awaiting triage" },
          { label: "Past Due", hint: "Open > 7d" },
          { label: "Resolved (MTD)", hint: "This month" },
          { label: "Unassigned", hint: "No assignee" },
        ]}
      />

      <Listing
        title="Open Bugs"
        columns={["Sender", "Title", "App", "Assignee", "Date Found", "Priority"]}
        empty={
          <StubEmpty
            what="bugs"
            why="There is no ticket model yet — the in-app bug reporter says plainly that it files nothing, so this queue has nothing to list."
          />
        }
      />
    </div>
  );
}
