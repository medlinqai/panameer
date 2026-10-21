import Link from "next/link";
import { jobPath } from "@/lib/work-request-path";

// WP-E001–E003: a Work Request's own path, up to where the Work Order takes over (its money track lives on the WO page).
// Award = the hire decision (creates the Work Request); Approval (auto in R1) creates the Work Order.
const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null);
const WR_STATUS: Record<string, string> = { INCOMPLETE: "Incomplete", SUBMITTED: "Submitted", PENDING_APPROVAL: "Pending Approval", APPROVED: "Approved", RETURNED: "Returned", REJECTED: "Rejected", WITHDRAWN: "Withdrawn" };

export async function WorkRequestPath({ jobId }: { jobId: string }) {
  const path = await jobPath(jobId);
  if (!path) return null;
  const { job, shown, current, wrs, orders, awarded, numberOf } = path;
  return (
    <section data-work-request-path className="mt-5 rounded-brand border border-line bg-white p-5">
      <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">
        Work Request Path · {job.job_number ?? "Job"}{awarded && wrs[0].wr_number ? ` · ${wrs.map((w) => w.wr_number).filter(Boolean).join(", ")}` : ""}
      </h2>
      <ol className="mt-3 flex flex-wrap gap-x-1 gap-y-4">
        {shown.map((s) => {
          const skipped = s.optional && !s.done && awarded;
          const isCurrent = s.key === current;
          const dot = s.done
            ? "grid h-8 w-8 place-items-center rounded-full bg-ink text-[14px] font-bold text-white"
            : isCurrent
              ? "grid h-8 w-8 place-items-center rounded-full border-2 border-magenta bg-white text-[13px] font-bold text-magenta-dark ring-2 ring-magenta/30"
              : s.optional
                ? "grid h-8 w-8 place-items-center rounded-full border-2 border-dashed border-[#C9CDDC] bg-white text-[12px] text-ink-3"
                : "grid h-8 w-8 place-items-center rounded-full border-2 border-[#C9CDDC] bg-white text-[13px] font-bold text-ink-3";
          const body = (
            <>
              <span className={dot} aria-hidden>{s.done ? "✓" : skipped ? "–" : ""}</span>
              <span className={s.done || isCurrent ? "mt-1.5 block text-[13px] font-bold leading-tight" : "mt-1.5 block text-[13px] font-bold leading-tight text-ink-3"}>{s.label}</span>
              {s.optional && <span className="block text-[11px] text-ink-3">{skipped ? "Skipped" : "Optional"}</span>}
              {s.date && s.done && <span className="block text-[11.5px] text-ink-2">{day(s.date)}</span>}
              {s.note && <span className="block text-[11.5px] text-ink-2">{s.note}</span>}
            </>
          );
          return (
            <li key={s.key} className="flex w-[104px] flex-col items-center text-center" data-step={s.key} data-state={s.done ? "done" : isCurrent ? "current" : skipped ? "skipped" : "upcoming"}>
              {s.href ? <Link href={s.href} className="flex flex-col items-center hover:underline">{body}</Link> : body}
              {isCurrent && s.key === "proposals" && s.href && <Link href={s.href} className="mt-1.5 inline-flex min-h-8 items-center bg-ink px-3 text-[12px] font-bold text-surface hover:bg-ink-hover" data-review-proposals>Review proposals</Link>}
            </li>
          );
        })}
      </ol>
      {awarded && (
        <ul className="mt-4 border-t border-line pt-2 text-[13px]" data-path-work-requests>
          {wrs.flatMap((w) => w.lines.map((l) => {
            const wo = orders.find((o) => o.id === l.work_order_id);
            return (
              <li key={`${w.id}-${l.provider_person_id}`} className="flex flex-wrap justify-between gap-2 py-1">
                <span><b className="font-mono">{w.wr_number ?? "Work Request"}</b> · {numberOf(l.provider_person_id!)}</span>
                <span className="text-ink-2">{WR_STATUS[w.status] ?? w.status}{wo && <> · <Link href={`/orders/${wo.id}`} className="font-semibold text-magenta-dark underline underline-offset-4">{wo.order_number}</Link></>}</span>
              </li>
            );
          }))}
        </ul>
      )}
    </section>
  );
}
