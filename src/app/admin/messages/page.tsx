import { TileRow, Listing, StubEmpty } from "@/components/console/ConsolePage";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Threads", hint: "Your internal threads" },
          { label: "Unread", hint: "New since you last read" },
          { label: "Tagged Companies", hint: "Threads about a company" },
        ]}
      />

      <Listing
        title="Internal Threads"
        columns={["Sender", "Subject", "Details", "Direction", "Date/Time"]}
        action={
          <span className="flex items-center gap-2">
            <span className="inline-flex overflow-hidden rounded-[8px] border border-line text-[13px]">
              <span className="bg-magenta px-3 py-1.5 font-semibold text-white">All</span>
              <span className="px-3 py-1.5 text-ink-2">Unread</span>
            </span>
            <button
              type="button"
              disabled
              title="Messaging isn't built yet"
              className="cursor-not-allowed bg-magenta/30 px-4 py-1.5 text-[13px] font-bold text-white"
            >
              + New Thread
            </button>
          </span>
        }
        empty={
          <StubEmpty
            what="threads"
            why="Messaging is a Medlinq port still on the backlog — there is no thread or message model to read from."
          />
        }
      />
    </div>
  );
}
