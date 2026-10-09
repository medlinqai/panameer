import { SETTLEMENT_LABEL } from "@/lib/oracle-status";
import Link from "next/link";
import { formatCents } from "@/lib/display";
import type { TimesheetWeek } from "@/lib/wo-plan";

const STATUS: Record<string, string> = SETTLEMENT_LABEL;

// Board 3: week · hours · amount · status, one line per week of each payment request.
export function Timesheets({ weeks, currency }: { weeks: TimesheetWeek[]; currency: string }) {
  return (
    <section data-testid="timesheets" className="mt-8">
      <h2 className="text-[20px] font-bold">Timesheets</h2>
      {weeks.length === 0 ? (
        <p className="mt-2 border-t border-line py-4 text-[14px] text-ink-2">No time submitted yet.</p>
      ) : (
        <table className="mt-2 w-full text-[14px]">
          <thead>
            <tr className="border-b border-ink text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
              <th className="py-2">Week of</th><th className="py-2 text-right">Hours</th><th className="py-2 text-right">Amount</th><th className="py-2 pl-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={`${w.requestId}-${w.week}`} className="border-b border-line">
                <td className="py-2">
                  <Link href={`/payments/payment-requests/${w.requestId}`} className="hover:underline">{w.week}</Link>
                  <span className="ml-2 font-mono text-[12px] text-ink-2">{w.number}</span>
                </td>
                <td className="py-2 text-right tabular-nums">{w.hours}</td>
                <td className="py-2 text-right tabular-nums">{formatCents(w.amountCents, currency)}</td>
                <td className="py-2 pl-4">{STATUS[w.status] ?? w.status.toLowerCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
