import type { HistoryEvent } from "@/lib/transaction-history";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

// Thin-line timeline: when · who · what, oldest first.
export function History({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section data-testid="history" className="mt-8 border-t border-line pt-4">
      <h2 className="text-[18px] font-bold">History</h2>
      <ol className="mt-2">
        {events.map((e, i) => (
          <li key={i} className="grid grid-cols-1 gap-x-4 border-b border-line py-2 text-[14px] sm:grid-cols-[180px_1fr]">
            <span className="text-[12.5px] text-ink-2">{fmt(e.at)}</span>
            <span>
              {e.who && <b className="font-semibold">{e.who} </b>}
              {e.what}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
