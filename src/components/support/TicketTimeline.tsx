import type { TimelineEntry } from "@/lib/support";

/**
 * ⚠⚠⚠ ONE TIMELINE (`P2-ALL-E761`), oldest at the top, newest at the bottom.
 *
 * Scott, working `PAN-CTXFTX`: *"I assigned it to me and asked a question. Want to
 * see that history on the ticket."* ⚠ Events and messages interleave, because
 * that is how a person reads a ticket — not as two lists to cross-reference.
 *
 * ⚠⚠ **WHAT IT SHOWS IS DECIDED BY THE QUERY, NOT HERE.** `ticketTimeline`
 * filters for the reporter, so this component renders whatever it is given and
 * cannot leak a kind the reporter was never meant to see.
 *
 * ⚠ The open pattern (`phase_3_ui.md`): thin lines, no boxes, tokens throughout.
 */
function when(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** ⚠ One sentence per kind. `names` resolves an assignee id to a person. */
function sentence(e: TimelineEntry, names: Map<string, string>): string {
  const who = (id: string | null) => (id && names.get(id)) || "someone";
  switch (e.kind) {
    case "filed":
      return `${e.actorName} filed the ticket`;
    case "assigned":
      /* ⚠ "assigned it to themselves" reads better than repeating the name, and
         it is also the honest description of what happened. */
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
    /* ⚠⚠ A REAL EMPTY STATE, NOT A BLANK. The timeline begins at the `filed`
       event, and a ticket with none is a ticket from before `E761` whose backfill
       has not run — saying so beats an empty box. */
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
            {/* ⚠ The from → to pair is shown for status and priority, which are
                the two kinds where the VALUES are the information. */}
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
