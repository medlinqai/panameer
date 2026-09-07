import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getTicket } from "@/lib/support";
import { supportApplicationLabel } from "@/lib/support-applications";
import { TicketThread } from "@/components/support/TicketThread";
import { TicketReplyBox } from "@/components/support/TicketReplyBox";

/**
 * The reporter's view of one ticket, including Panameer's replies
 * (`P2-J1.1-E032` WS-4).
 *
 * ⚠⚠ SCOPED IN THE LIB, NOT HERE. `getTicket(viewer, id)` without `asAdmin`
 * returns null unless the session's person is the REPORTER, so a guessed ticket
 * id gets a 404 rather than someone else's bug report — which could contain
 * their email, their screen, and a screenshot.
 * ⚠ NO SCREENSHOT IS RENDERED ON THIS PAGE. The reporter took it, and re-serving
 * a private object costs a signed URL for no new information.
 */
export const metadata = { title: "Support Ticket · Panameer" };

export default async function MyTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const viewer = await guardPage("authenticated");
  const { ticketId } = await params;

  const found = await getTicket(viewer, ticketId);
  if (!found) notFound();
  const { ticket, messages } = found;

  const closed = ticket.status === "Resolved" || ticket.status === "Closed";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/support/tickets" className="text-[14px] font-semibold text-magenta hover:underline">
        ← My tickets
      </Link>

      <h1 className="mt-3 font-display text-[26px] font-bold tracking-[-0.5px]">{ticket.title}</h1>
      <p className="mt-1 text-[13.5px] text-ink-2">
        <span className="font-mono">{ticket.ticket_code}</span> ·{" "}
        {supportApplicationLabel(ticket.application)} · {ticket.status}
      </p>

      <section className="mt-5 rounded-brand border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">What you reported</h2>
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{ticket.description}</p>
        {ticket.screenshot_path && (
          <p className="mt-3 text-[13.5px] text-ink-2">A screenshot is attached and visible to the Panameer team.</p>
        )}
      </section>

      {ticket.resolution_description && (
        <section className="mt-5 rounded-brand border border-emerald-300 bg-emerald-50/60 p-5">
          <h2 className="text-[16px] font-bold">Resolution</h2>
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{ticket.resolution_description}</p>
        </section>
      )}

      <TicketThread messages={messages} reporterName="You" />

      {/* ⚠ A CLOSED TICKET STILL SHOWS ITS THREAD — the record is the point — but
          the reply box comes off, so nobody types into a ticket nobody is
          watching. Filing a new one is the honest path. */}
      {closed ? (
        <p className="mt-4 text-[14px] text-ink-2">
          This ticket is {ticket.status.toLowerCase()}.{" "}
          <Link href="/support/bug" className="font-semibold text-magenta underline">
            Report a new bug
          </Link>{" "}
          if it happens again.
        </p>
      ) : (
        <TicketReplyBox ticketId={ticket.id} />
      )}
    </div>
  );
}
