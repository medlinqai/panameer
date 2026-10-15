import Link from "next/link";
import { stoppedPartway } from "@/lib/registration-followup";

// SO-E006: Admin › Users › Stopped Partway — signed up, registration not finished, idle ≥ 24 h. Newest first.
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "—");

export async function StoppedPartway() {
  const rows = await stoppedPartway();
  return (
    <section data-stopped-partway className="mt-2">
      <p className="text-[13px] text-ink-2">{rows.length} {rows.length === 1 ? "person" : "people"} signed up but didn&apos;t finish registration, with no activity for 24 hours. Two reminders go out (day 1, day 7); admins hear on day 8.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="border-b-2 border-ink text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-2">
            <tr>{["Name", "Email", "Side", "Stopped at", "Signed up", "Last activity", "Reminders", "Admin follow-up"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.personId} data-stopped-row className="border-b border-line">
                <td className="px-2 py-2"><Link href={`/admin/users/${r.personId}`} className="font-semibold text-magenta-ink underline underline-offset-2">{r.name}</Link></td>
                <td className="px-2 py-2">{r.email}</td>
                <td className="px-2 py-2">{r.side}</td>
                <td className="px-2 py-2 font-semibold">{r.stoppedAt}</td>
                <td className="px-2 py-2">{d(r.signedUp)}</td>
                <td className="px-2 py-2">{d(r.lastActivity)}</td>
                <td className="px-2 py-2">{r.reminders}{r.adminNotifiedAt ? " · admins told" : ""}</td>
                <td className="px-2 py-2">{r.followedUp ? (r.reason ? `${r.reason}${r.note ? ` — ${r.note}` : ""}` : "Emailed") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
