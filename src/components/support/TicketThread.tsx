/**
 * The two-sided ticket thread (`P2-J1.1-E032` WS-4).
 *
 * ⚠ ONE COMPONENT FOR BOTH SIDES so the reporter and the admin cannot end up
 * looking at differently-shaped records of the same conversation. `author_side`
 * decides which way a message leans and what it is labelled — `"panameer"` is
 * Panameer Support, anything else is the reporter.
 */
export function TicketThread({
  messages,
  reporterName,
}: {
  messages: { id: string; author_side: string; body: string; created_at: Date }[];
  reporterName: string;
}) {
  if (messages.length === 0) {
    return (
      <section className="mt-5 rounded-brand border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">Conversation</h2>
        <p className="mt-1 text-[14.5px] text-ink-2">No replies yet.</p>
      </section>
    );
  }
  return (
    <section className="mt-5 rounded-brand border border-line bg-white p-5">
      <h2 className="text-[16px] font-bold">Conversation</h2>
      <ol className="mt-3 space-y-3">
        {messages.map((m) => {
          const fromPanameer = m.author_side === "panameer";
          return (
            <li
              key={m.id}
              className={
                "rounded-[12px] border p-4 " +
                (fromPanameer ? "border-magenta/30 bg-magenta/[0.04]" : "border-line bg-bg-soft")
              }
            >
              <p className="text-[13px] font-bold">
                {fromPanameer ? "Panameer Support" : reporterName}
                <span className="ml-2 font-normal text-ink-2">
                  {m.created_at.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
