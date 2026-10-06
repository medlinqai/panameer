import type { TimelineEntry } from "@/lib/support";

function when(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sentence(e: TimelineEntry, names: Map<string, string>): string {
  const who = (id: string | null) => (id && names.get(id)) || "someone";
  switch (e.kind) {
    case "filed":
      return `${e.actorName} filed the ticket`;
    case "assigned":
      // it is also the honest description of what happened.
      return e.toValue === e.actorPersonId
        ? `${e.actorName} assigned it to themselves`
        : `${e.actorName} assigned it to ${who(e.toValue)}`;
    case "unassigned":
      return `${e.actorName} unassigned it`;
    case "status":
      return `${e.actorName} changed status`;
    case "priority":
      return `${e.actorName} changed priority`;
    default:
      return `${e.actorName} wrote`;
  }
}

export function TicketTimeline({
  entries,
  names,
}: {
  entries: TimelineEntry[];
  /** id → name, for assignee ids inside `to_value`. Resolved on the server. */
  names: Record<string, string>;
}) {
  const nameMap = new Map(Object.entries(names));

  if (entries.length === 0) {
    // A REAL EMPTY STATE, NOT A BLANK. The timeline begins at the `filed`
    return <p className="mt-3 text-[14px] text-ink-2">No history recorded yet.</p>;
  }

  return (
    <ol className="mt-3 border-t border-line">
      {entries.map((e) => (
        <li key={e.id} className="border-b border-line py-2.5">
          <p className="text-[13px] text-ink-2">
            <span className="font-mono">{when(e.at)}</span>
            <span className="mx-2 text-ink-3">·</span>
            <span className="text-ink">{sentence(e, nameMap)}</span>
            {/* The from → to pair is shown for status and priority, which are */}
            {(e.kind === "status" || e.kind === "priority") && (
              <span className="ml-2 text-ink-2">
                {e.fromValue ?? "—"} → <span className="font-semibold text-ink">{e.toValue}</span>
              </span>
            )}
          </p>
          {e.body && (
            <p className="mt-1.5 whitespace-pre-wrap border-l-2 border-line pl-3 text-[14.5px] leading-relaxed text-ink">
              {e.body}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
