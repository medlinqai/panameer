import Link from "next/link";
import { listAllTickets, AWAITING_PANAMEER_STATUSES } from "@/lib/support";
import { supportApplicationLabel } from "@/lib/support-applications";

export const metadata = { title: "Support · Panameer Admin" };

const STATUS_TONE: Record<string, string> = {
  Open: "bg-magenta/10 text-magenta",
  "In Progress": "bg-sky-100 text-sky-800",
  "Waiting on Reporter": "bg-amber-100 text-amber-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-black/[0.06] text-ink-2",
};

export default async function AdminSupportPage() {
  const tickets = await listAllTickets();
  const waiting = tickets.filter((t) =>
    AWAITING_PANAMEER_STATUSES.includes(t.status as (typeof AWAITING_PANAMEER_STATUSES)[number]),
  ).length;

  return (
    <div>
      <h1 className="font-display text-[24px] font-bold tracking-[-0.4px]">Support</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">
        {tickets.length} ticket{tickets.length === 1 ? "" : "s"}, most recent activity first.
        {" "}
        {}
        <b className="font-semibold text-ink">{waiting} waiting on us</b>.
      </p>

      {tickets.length === 0 ? (
        <p className="mt-6 text-ink-2">No tickets have been filed yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-brand border border-line bg-white">
          <table className="w-full text-[14px]">
            <thead className="border-b border-line bg-bg-soft text-left text-[12.5px] uppercase tracking-wide text-ink-2">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Where</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/support/${t.id}`} className="font-semibold text-magenta hover:underline">
                      {t.title}
                    </Link>
                    <div className="font-mono text-[12px] text-ink-2">{t.ticket_code}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{supportApplicationLabel(t.application)}</td>
                  <td className="px-4 py-3 text-ink-2">
                    {t.reporter_name}
                    <div className="text-[12px]">{t.reporter_email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{t.priority}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${STATUS_TONE[t.status] ?? "bg-black/[0.06] text-ink-2"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {(t.last_message_at ?? t.created_at).toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
