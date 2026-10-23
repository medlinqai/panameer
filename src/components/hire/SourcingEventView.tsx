"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { eventForBuyer } from "@/lib/sourcing-events";
import { DeadlineTag } from "@/components/hire/Countdown";
import { CompareTable } from "@/components/hire/MatchList";
import { NeutralAvatar, isMaskedName } from "@/components/Avatar";
import { InterviewDialog } from "@/components/hire/InterviewDialog";
import { AskQuestionsDialog } from "@/components/hire/AskQuestionsDialog";

type Ev = Awaited<ReturnType<typeof eventForBuyer>>;
const STATUS: Record<string, string> = { DRAFT: "Draft", OPEN: "Open", CLOSED: "Closed", AWARDED: "Awarded" };
const BTN = "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3.5 text-[13px] font-semibold text-ink hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40";
const usd = (c: number | null) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

// CA-E004: Available first, then Declined, then no answer, then Not This Time.
const rank = (p: { proposal: { status: string } | null; requestStatus: string }) => (p.proposal ? (p.proposal.status === "DECLINED" ? 1 : 0) : p.requestStatus === "DECLINED" ? 3 : 2);

export function SourcingEventView({ ev }: { ev: Ev }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [interviewing, setInterviewing] = useState<string[] | null>(null);
  const [asking, setAsking] = useState<string[] | null>(null);
  const [extendBy, setExtendBy] = useState("24");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(ev.notifyOthers?.message ?? "");
  const per = ev.job.budget_type === "FIXED" ? "" : "/hr";
  const range = ev.job.budget_min_cents != null || ev.job.budget_max_cents != null ? `${usd(ev.job.budget_min_cents) ?? "…"} – ${usd(ev.job.budget_max_cents) ?? "…"}${per}` : null;
  const awarded = ev.status === "AWARDED" || ev.proposals.some((p) => p.proposal?.status === "AWARDED");

  const act = async (url: string, body: object, ok?: string) => {
    setBusy(true);
    setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setMsg(j.error ?? "That didn't work."); return; }
    if (ok) setMsg(ok);
    router.refresh();
  };
  /** Run one call per ticked row, then one message. */
  const bulk = async (one: (personId: string) => Promise<void>, ok: string) => { for (const id of picked) await one(id); setMsg(ok); setPicked(new Set()); };
  const booked = ev.proposals.filter((p) => p.interview?.status === "SCHEDULED").length;
  const nextLine = awarded ? "A provider is hired — see the Order tab. The others are told when the Order is released."
    : !ev.counts.proposed ? `Waiting for answers — ${ev.counts.requested} asked. Extend the deadline if you need more time.`
    : booked ? `${ev.counts.proposed} of ${ev.counts.requested} answered and ${booked} interview${booked === 1 ? " is" : "s are"} booked. After the interviews, Hire one — the others are told when the Order is released.`
    : `${ev.counts.proposed} of ${ev.counts.requested} answered. Tick the ones you like and Interview them, or Hire one now.`;
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const withProposal = ev.proposals.filter((p) => p.proposal && p.proposal.status !== "DECLINED");

  return (
    <div data-sourcing-event>
      {/* OJ-E003: on the Job's Responses tab — the page owns the header; this is the deadline, Extend and the Next line. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]" data-responses-head>
        {ev.status === "OPEN" ? <span className="text-[12.5px] font-bold"><DeadlineTag at={ev.deadlineAt} prefix={`Answers due ${new Date(ev.deadlineAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ·`} /></span>
          : <span className="rounded-full border border-ink px-3 py-0.5 text-[12.5px] font-bold" data-event-status>{STATUS[ev.status]}</span>}
        <span className="text-state-inactive" data-event-counts>{ev.number} · {ev.counts.requested} asked · {ev.counts.proposed} answered · {ev.counts.declined} not this time{range ? ` · your range ${range}` : ""}</span>
        {!awarded && (
          <span className="flex items-center gap-2">
            <span className="font-semibold">Extend by</span>
            <input inputMode="numeric" value={extendBy} onChange={(e) => setExtendBy(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-label="Hours to extend" className="w-14 rounded-[8px] border border-line px-2 py-1 text-right" />
            <span>h</span>
            <button type="button" className={GHOST} disabled={busy || !Number(extendBy)} onClick={() => act("/api/sourcing", { action: "extend", eventId: ev.id, hours: Number(extendBy) }, "Deadline extended.")} data-extend>Extend</button>
          </span>
        )}
      </div>
      <p className="mt-3 text-[13.5px] text-state-inactive" data-next-line><b className="text-ink">Next:</b> {nextLine}</p>

      {ev.notifyOthers && (
        <section className="mt-5 rounded-brand border border-magenta-dark bg-[#fbeafb]/40 p-5" data-notify-others>
          <h2 className="text-[16px] font-extrabold">Let the Other Candidates Know</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">The Order is Released. This goes to the {ev.notifyOthers.count} provider{ev.notifyOthers.count === 1 ? "" : "s"} you didn&apos;t award (bell + email).</p>
          <textarea value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} maxLength={2000} aria-label="Message to the other candidates" className="mt-2 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14px]" />
          <button type="button" className={`${BTN} mt-3`} disabled={busy || !notice.trim()} onClick={() => act("/api/sourcing", { action: "notifyOthers", eventId: ev.id, note: notice }, "Sent — the round is closed.")} data-send-not-awarded>Send</button>
        </section>
      )}
      {ev.othersNotifiedAt && <p className="mt-4 text-[13.5px] text-ink-2">The other candidates were told on {new Date(ev.othersNotifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.</p>}

      <section className="mt-5">
        <h2 className="text-[18px] font-extrabold">Responses</h2>
        {/* Scott 10-22 ("what do I do now?"): one line that says the next move. */}
        {!awarded && (() => {
          const { requested: req, proposed: yes, declined: no } = ev.counts;
          const waiting = Math.max(0, req - yes - no);
          const passed = new Date(ev.deadlineAt).getTime() <= Date.now();
          const next = yes === 0
            ? (passed ? "No one answered. Extend the deadline above, or Create a Job again with more providers." : `Waiting on ${req} of ${req}. Their answers appear here as they come in.`)
            : waiting > 0 && !passed
              ? `${yes} of ${req} answered, waiting on ${waiting}. You can act on those who answered now: Decline who you don't want, Interview, then Hire.`
              : `${yes} of ${req} answered. Decline who you don't want, Interview the rest, then Hire.`;
          return <p className="mt-1 text-[13.5px] text-ink-2" data-next-step><b className="text-ink">Next:</b> {next}</p>;
        })()}
        {/* IW-E003: joint actions on the ticked rows; the row buttons stay as they are. */}
        {!awarded && (
          <div className="mt-2 flex flex-wrap items-center gap-2 border-y border-state-border bg-bg-soft px-3 py-2" data-bulk-bar>
            <button type="button" className={GHOST} onClick={() => setPicked(new Set(withProposal.filter((p) => p.proposal?.status === "SHORTLISTED").map((p) => p.personId)))} data-select-shortlisted>Select All Shortlisted</button>
            <span className="text-[13px] text-state-inactive">{picked.size} selected</span>
            <span className="flex-1" />
            <button type="button" className={GHOST} disabled={picked.size < 2 || picked.size > 4} onClick={() => setComparing(true)} data-compare-proposals title="Tick 2 to 4 responses">Compare{picked.size >= 2 ? ` ${picked.size}` : ""}</button>
            <button type="button" className={GHOST} disabled={busy || !picked.size} onClick={() => setAsking([...picked])} data-bulk-ask>Ask Questions{picked.size ? ` ${picked.size}` : ""}</button>
            <button type="button" className={GHOST} disabled={busy || !picked.size} onClick={() => setInterviewing([...picked])} data-bulk-interview>Interview{picked.size ? ` ${picked.size}` : ""}</button>
            <button type="button" className={GHOST} disabled={busy || !picked.size || !ev.certificationTestId} title={ev.certificationTestId ? undefined : "No certification test exists for this job's skills yet"} onClick={() => bulk((id) => act(`/api/work-requests/${ev.jobId}/test`, { providerPersonId: id, learnAssessmentId: ev.certificationTestId }), "Tests sent.")} data-bulk-test>Request Test{picked.size ? ` ${picked.size}` : ""}</button>
            <button type="button" className={GHOST} disabled={busy || !picked.size} onClick={() => act("/api/sourcing", { action: "decide", proposalIds: withProposal.filter((p) => picked.has(p.personId)).map((p) => p.proposal!.id), decision: "DECLINED" }, "Declined.").then(() => setPicked(new Set()))} data-bulk-decline>Decline{picked.size ? ` ${picked.size}` : ""}</button>
          </div>
        )}
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {[...ev.proposals].sort((a, b) => rank(a) - rank(b) || (a.proposal?.rateCents ?? Infinity) - (b.proposal?.rateCents ?? Infinity)).map((p) => {
            const pr = p.proposal;
            const over = pr?.rateCents != null && ev.job.budget_max_cents != null && pr.rateCents > ev.job.budget_max_cents;
            return (
              <li key={p.personId} className="flex flex-wrap items-start gap-3 py-3" data-event-proposal={p.match.name}>
                {pr && pr.status !== "DECLINED" ? <input type="checkbox" checked={picked.has(p.personId)} onChange={() => toggle(p.personId)} aria-label={`Compare ${p.match.name}`} className="mt-1 h-4 w-4" /> : <span className="w-4" />}
                {isMaskedName(p.match.name) && <NeutralAvatar size={36} photoUrl={p.match.photoUrl} />}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{p.match.name}{pr && pr.status !== "DECLINED" && !awarded ? <button type="button" disabled={busy} onClick={() => act("/api/sourcing", { action: pr.status === "SHORTLISTED" ? "unshortlist" : "shortlist", eventId: ev.id, proposalId: pr.id })} aria-label={pr.status === "SHORTLISTED" ? "Remove from Shortlist" : "Shortlist"} className={`ml-2 ${pr.status === "SHORTLISTED" ? "text-magenta-dark" : "text-state-border"}`} data-star>{pr.status === "SHORTLISTED" ? "★" : "☆"}</button> : pr?.status === "SHORTLISTED" && <span className="ml-2 text-magenta-dark">★</span>}{pr?.status === "AWARDED" && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[11px] text-surface">Awarded</span>}</p>
                  <p className="text-[13px] text-ink-2">{p.match.line}</p>
                  {pr ? (
                    <p className="mt-1 text-[13.5px]" data-response-line>{pr.status === "DECLINED" ? <b className="text-state-declined">Declined</b> : <b className="text-state-accepted">Available</b>} · <b className={over ? "text-state-declined" : ""}>{usd(pr.rateCents)}{per}</b>{range && <span className="text-ink-2"> vs {range}</span>}{pr.start && <span className="text-ink-2"> · start {pr.start}</span>}</p>
                  ) : (
                    <p className="mt-1 text-[13.5px] text-ink-3">{p.requestStatus === "DECLINED" ? <><b className="text-state-declined">Not This Time</b>{p.declineReason ? ` — “${p.declineReason}”` : ""}</> : "No response yet"}</p>
                  )}
                  {pr?.note && <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{pr.note}</p>}
                  <RowPills p={p} />
                  {p.qa?.status === "in" && (
                    <details className="mt-2 text-[13px]" data-qa>
                      <summary className="cursor-pointer font-semibold">Read Answers ({p.qa.qa.length})</summary>
                      <ol className="mt-1.5 flex flex-col gap-1.5">{p.qa.qa.map((x, i) => <li key={i}><b>{x.q}</b><p className="whitespace-pre-wrap text-ink-2">{x.a}</p></li>)}</ol>
                    </details>
                  )}
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]">
                    {p.match.why.map((k) => <span key={k} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-2 font-semibold text-magenta-dark">{k}</span>)}
                    {p.match.matched.map((k) => <span key={k} className="rounded-full border border-line bg-bg-soft px-2">{k}</span>)}
                  </p>
                </div>
                {pr && pr.status !== "DECLINED" && !awarded && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button type="button" className={GHOST} disabled={busy} onClick={() => act("/api/sourcing", { action: "declineProposal", eventId: ev.id, proposalId: pr.id })}>Decline</button>
                    <button type="button" className={GHOST} disabled={busy} onClick={() => setInterviewing([p.personId])} data-request-interview>Interview</button>
                    <button type="button" className={GHOST} disabled={busy} onClick={() => setAsking([p.personId])} data-row-ask>Ask Questions</button>
                    <button type="button" className={GHOST} disabled={busy || !ev.certificationTestId} title={ev.certificationTestId ? undefined : "No certification test exists for this job's skills yet"} onClick={() => act(`/api/work-requests/${ev.jobId}/test`, { providerPersonId: p.personId, learnAssessmentId: ev.certificationTestId }, "Certification test sent.")} data-request-test>Request Test</button>
                    <Link href={`/hire/terms?job=${ev.jobId}&provider=${p.personId}`} className={BTN} data-award>Hire</Link>
                  </div>
                )}
              </li>
            );
          })}
          {!ev.proposals.length && <li className="py-4 text-[13.5px] text-ink-3">No requests in this event.</li>}
        </ul>
        {msg && <p role="status" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{msg}</p>}
        {ev.workOrderId && <p className="mt-3 text-[13.5px]">Order: <Link href={`/orders/${ev.workOrderId}`} className="font-semibold text-magenta-dark underline underline-offset-4">open it</Link></p>}
      </section>
      {asking && <AskQuestionsDialog jobId={ev.jobId} providerPersonIds={asking} defaultDue={ev.deadlineAt} onClose={() => setAsking(null)} onSent={(m) => { setMsg(m); setPicked(new Set()); }} />}
      {interviewing && <InterviewDialog jobId={ev.jobId} providerPersonIds={interviewing} onClose={() => setInterviewing(null)} onSent={(m) => { setMsg(m); setPicked(new Set()); }} />}
      {comparing && <CompareTable rows={withProposal.filter((p) => picked.has(p.personId)).map((p) => ({ m: p.match, proposed: p.proposal?.rateCents != null ? `${usd(p.proposal.rateCents)}${per}` : null, start: p.proposal?.start ?? null, qa: p.qa?.status === "in" ? p.qa.qa : null }))} onClose={() => setComparing(false)} />}
    </div>
  );
}

/** IW-E006 / OJ-E003: the row's interview and test state as pills. */
function RowPills({ p }: { p: Ev["proposals"][number] }) {
  const iv = p.interview;
  const PILL = "rounded-full px-2.5 py-0.5 text-[11.5px] font-bold";
  return (
    <span className="mt-1.5 flex flex-wrap gap-1.5" data-row-pills>
      {iv && (iv.status === "SCHEDULED" && iv.startsAt ? <span className={`${PILL} bg-state-accepted-bg text-state-accepted`} data-interview-state="booked">Interview {new Date(iv.startsAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
        : iv.status === "COMPLETED" ? <span className={`${PILL} bg-state-inactive-bg text-state-inactive`} data-interview-state="done">Interview Done</span>
        : <span className={`${PILL} bg-state-pending-bg text-state-pending`} data-interview-state="invited">Invited, Not Booked</span>)}
      {p.qa && <span className={`${PILL} ${p.qa.status === "in" ? "bg-state-accepted-bg text-state-accepted" : "bg-state-pending-bg text-state-pending"}`} data-qa-state={p.qa.status}>{p.qa.status === "in" ? "Answers In" : "Questions Sent"}</span>}
      {p.test && <span className={`${PILL} ${p.test === "PASSED" ? "bg-state-accepted-bg text-state-accepted" : p.test === "FAILED" ? "bg-state-declined-bg text-state-declined" : "bg-state-pending-bg text-state-pending"}`} data-test-state={p.test}>{p.test === "PASSED" ? "Test Passed" : p.test === "FAILED" ? "Test Failed" : "Test Sent"}</span>}
    </span>
  );
}
