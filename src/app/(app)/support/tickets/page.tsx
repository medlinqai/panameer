import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { listOwnTickets } from "@/lib/support";
import { supportApplicationLabel } from "@/lib/support-applications";

export const metadata = { title: "My Support Tickets · Panameer" };

export default async function MyTicketsPage() {
  const viewer = await guardPage("authenticated");
  const tickets = await listOwnTickets(viewer);

  return (
    <div className="mx-auto max-w-3xl">
      {}
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">My Tickets</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Bugs you&apos;ve reported, and anything Panameer has replied.
      </p>

      {tickets.length === 0 ? (
        <p className="mt-6 text-ink-2">
          You haven&apos;t reported anything yet.{" "}
          <Link href="/support/bug" className="font-semibold text-magenta underline">
            Report a bug
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {tickets.map((t) => (
            <li key={t.id} className="rounded-brand border border-line bg-white p-4">
              <Link href={`/support/tickets/${t.id}`} className="text-[16px] font-bold text-magenta hover:underline">
                {t.title}
              </Link>
              <p className="mt-1 text-[13.5px] text-ink-2">
                <span className="font-mono">{t.ticket_code}</span> ·{" "}
                {supportApplicationLabel(t.application)} · {t.status} ·{" "}
                {(t.last_message_at ?? t.created_at).toISOString().slice(0, 10)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
