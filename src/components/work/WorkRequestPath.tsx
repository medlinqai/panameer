import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { providerLabel, providerNumbers } from "@/lib/provider-number";

// WP-E001–E003: a Work Request's own path, up to where the Work Order takes over (its money track lives on the WO page).
// Award = the hire decision (creates the Work Request); Approval (auto in R1) creates the Work Order.
type Step = { key: string; label: string; done: boolean; date: Date | null; note?: string | null; href?: string; optional?: boolean; hidden?: boolean };

const day = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null);
const when = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const first = (ds: (Date | null | undefined)[]) => ds.filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
const WR_STATUS: Record<string, string> = { INCOMPLETE: "Incomplete", SUBMITTED: "Submitted", PENDING_APPROVAL: "Pending Approval", APPROVED: "Approved", RETURNED: "Returned", REJECTED: "Rejected", WITHDRAWN: "Withdrawn" };

export async function WorkRequestPath({ jobId }: { jobId: string }) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { job_number: true, created_at: true } });
  if (!job) return null;
  const [stars, event, interview, test, wrs] = await Promise.all([
    prisma.shortlistLine.findMany({ where: { shortlist: { job_id: jobId }, source: { in: ["SHORTLISTED", "ADDED"] } }, select: { created_at: true } }),
    prisma.sourcingEvent.findFirst({ where: { job_id: jobId, status: { not: "DRAFT" } }, orderBy: { created_at: "desc" }, select: { id: true, created_at: true, deadline_at: true, proposalRequests: { select: { bid: { select: { status: true, submitted_at: true } } } } } }),
    prisma.interviewRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { created_at: true } }),
    prisma.testRequest.findFirst({ where: { job_id: jobId }, orderBy: { created_at: "asc" }, select: { created_at: true } }),
    prisma.workRequest.findMany({
      where: { job_id: jobId, lines: { some: { provider_person_id: { not: null }, status: { in: ["ASSIGNED", "ORDERED"] } } } }, orderBy: { created_at: "asc" },
      select: { id: true, wr_number: true, status: true, submitted_at: true, approved_at: true, created_at: true, lines: { where: { provider_person_id: { not: null } }, select: { provider_person_id: true, updated_at: true, work_order_id: true } } },
    }),
  ]);
  const orders = wrs.length ? await prisma.workOrder.findMany({ where: { work_request_id: { in: wrs.map((w) => w.id) }, status: { not: "CANCELLED" } }, orderBy: { created_at: "asc" }, select: { id: true, order_number: true, created_at: true } }) : [];
  const providerIds = [...new Set(wrs.flatMap((w) => w.lines.map((l) => l.provider_person_id!)))];
  const profiles = providerIds.length ? await prisma.providerProfile.findMany({ where: { person_id: { in: providerIds } }, select: { id: true, person_id: true } }) : [];
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const numberOf = (personId: string) => providerLabel(nums.get(profiles.find((p) => p.person_id === personId)?.id ?? ""));

  const sourced = !!event;
  const asked = event?.proposalRequests.length ?? 0;
  const bids = event?.proposalRequests.filter((r) => r.bid && !["DRAFT", "WITHDRAWN"].includes(r.bid.status)) ?? [];
  const awardedAt = first(wrs.flatMap((w) => [w.submitted_at, ...w.lines.map((l) => l.updated_at)]));
  const approvedAt = first(wrs.map((w) => w.approved_at));
  const awarded = wrs.length > 0;
  const steps: Step[] = [
    { key: "job", label: "Job", done: true, date: job.created_at },
    { key: "shortlist", label: "Shortlist", done: stars.length > 0 || sourced, date: first(stars.map((s) => s.created_at)) ?? event?.created_at ?? null, href: "#matches" },
    { key: "request", label: "Request Proposals", done: sourced, date: event?.created_at ?? null, note: event ? `${asked} asked · due ${when(event.deadline_at)}` : null, href: "#matches", hidden: !sourced && awarded },
    { key: "proposals", label: "Proposals In", done: bids.length > 0, date: first(bids.map((b) => b.bid?.submitted_at)), note: event ? `${bids.length} of ${asked} in` : null, href: event ? `/hire/sourcing/${event.id}` : undefined, hidden: !sourced && awarded },
    { key: "interview", label: "Interview", done: !!interview, date: interview?.created_at ?? null, optional: true },
    { key: "test", label: "Test", done: !!test, date: test?.created_at ?? null, optional: true },
    { key: "award", label: "Award", done: awarded, date: awardedAt },
    { key: "approval", label: "Approval", done: !!approvedAt, date: approvedAt, note: approvedAt ? "Auto-approved" : null },
    { key: "wo", label: "Work Order Created", done: orders.length > 0, date: orders[0]?.created_at ?? null, href: orders[0] ? `/orders/${orders[0].id}` : undefined },
  ];
  const shown = steps.filter((s) => !s.hidden);
  const current = shown.find((s) => !s.done && !s.optional)?.key ?? null;
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
