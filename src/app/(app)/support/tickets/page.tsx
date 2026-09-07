import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { listOwnTickets } from "@/lib/support";
import { supportApplicationLabel } from "@/lib/support-applications";

/**
 * The reporter's own tickets (`P2-J1.1-E032` WS-4).
 *
 * ⚠⚠ THIS IS WHERE THE REPORTER SEES THE REPLY, AND THE CHOICE IS ARGUED RATHER
 * THAN ASSUMED. The brief left it open — a page, the bell, or an email — and
 * said chat's view is a page. It is, and the reason is that the other two are
 * not available to this brief: the notification bell is `E033`'s architecture
 * (worklist, fan-out, dropdown) and an email on reply is `E034`'s, and the brief
 * scopes both out. A page under the reporter's own account is the MINIMUM that
 * makes reply real — without it the admin is typing into a thread nobody can
 * read, and the feature is a suggestion box with extra steps.
 * ⚠ NO NOTIFICATION PATH IS BUILT HERE, deliberately. When `E033` lands, this
 * page is what its notification would link to.
 *
 * ⚠ `authenticated`, and the SCOPING IS IN THE LIB: `listOwnTickets` filters on
 * the session's person. There is no ticket id in this request to tamper with.
 */
export const metadata = { title: "My Support Tickets · Panameer" };

export default async function MyTicketsPage() {
  const viewer = await guardPage("authenticated");
  const tickets = await listOwnTickets(viewer);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">My Support Tickets</h1>
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
