import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getTicket, TICKET_STATUSES, TICKET_PRIORITIES } from "@/lib/support";
import { supportApplicationLabel } from "@/lib/support-applications";
import { signedSupportScreenshotUrl } from "@/lib/storage";
import { TicketAdminPanel } from "@/components/admin/TicketAdminPanel";
import { TicketThread } from "@/components/support/TicketThread";

/**
 * One ticket, its thread, and the admin's controls (`P2-J1.1-E032` WS-4).
 *
 * ⚠⚠ THE SCREENSHOT IS SIGNED HERE, ON THE SERVER, AND EXPIRES. The bucket is
 * PRIVATE, so there is no public URL to render — `signedSupportScreenshotUrl`
 * mints a short-lived link (300s) exactly the way `signedResumeUrl` does for a
 * résumé. The signing key never leaves the server, and a stale link stops
 * working rather than becoming a permanent handle on someone's screen contents.
 */
export const metadata = { title: "Ticket · Panameer Admin" };

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const viewer = await guardPage("canAdminister");
  const { ticketId } = await params;

  const found = await getTicket(viewer, ticketId, true);
  if (!found) notFound();
  const { ticket, messages } = found;

  const shot = ticket.screenshot_path
    ? await signedSupportScreenshotUrl(ticket.screenshot_path)
    : null;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/support" className="text-[14px] font-semibold text-magenta hover:underline">
        ← All tickets
      </Link>

      <h1 className="mt-3 font-display text-[24px] font-bold tracking-[-0.4px]">{ticket.title}</h1>
      <p className="mt-1 font-mono text-[13px] text-ink-2">{ticket.ticket_code}</p>

      <dl className="mt-4 grid gap-x-6 gap-y-2 rounded-brand border border-line bg-white p-5 text-[14.5px] sm:grid-cols-2">
        <div><dt className="text-ink-2">Where</dt><dd className="font-semibold">{supportApplicationLabel(ticket.application)}</dd></div>
        <div><dt className="text-ink-2">Reporter</dt><dd className="font-semibold">{ticket.reporter_name} · {ticket.reporter_email}</dd></div>
        <div><dt className="text-ink-2">Status</dt><dd className="font-semibold">{ticket.status}</dd></div>
        <div><dt className="text-ink-2">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div>
        <div><dt className="text-ink-2">Filed</dt><dd className="font-semibold">{ticket.created_at.toISOString().slice(0, 16).replace("T", " ")}</dd></div>
        <div><dt className="text-ink-2">Solved</dt><dd className="font-semibold">{ticket.date_solved ? ticket.date_solved.toISOString().slice(0, 10) : "—"}</dd></div>
      </dl>

      <section className="mt-5 rounded-brand border border-line bg-white p-5">
        <h2 className="text-[16px] font-bold">What happened</h2>
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{ticket.description}</p>
        {ticket.how_found && (
          <>
            <h2 className="mt-4 text-[16px] font-bold">How to reproduce</h2>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{ticket.how_found}</p>
          </>
        )}
        {shot && (
          <>
            <h2 className="mt-4 text-[16px] font-bold">Screenshot</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot} alt="Screenshot attached to this ticket" className="mt-2 max-w-full rounded-[10px] border border-line" />
            <p className="mt-1 text-[12.5px] text-ink-2">Private — this link expires.</p>
          </>
        )}
      </section>

      <TicketThread messages={messages} reporterName={ticket.reporter_name} />

      <TicketAdminPanel
        ticketId={ticket.id}
        status={ticket.status}
        priority={ticket.priority}
        resolution={ticket.resolution_description ?? ""}
        assigned={!!ticket.assignee_person_id}
        statuses={TICKET_STATUSES}
        priorities={TICKET_PRIORITIES}
      />
    </div>
  );
}
