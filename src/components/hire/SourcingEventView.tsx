"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { eventForBuyer } from "@/lib/sourcing-events";
import { Countdown } from "@/components/hire/Countdown";
import { CompareTable } from "@/components/hire/MatchList";
import { NeutralAvatar, isMaskedName } from "@/components/Avatar";

type Ev = Awaited<ReturnType<typeof eventForBuyer>>;
const STATUS: Record<string, string> = { DRAFT: "Draft", OPEN: "Open", CLOSED: "Closed", AWARDED: "Awarded" };
const BTN = "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3.5 text-[13px] font-semibold text-ink hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40";
const usd = (c: number | null) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

export function SourcingEventView({ ev }: { ev: Ev }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
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
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const withProposal = ev.proposals.filter((p) => p.proposal && p.proposal.status !== "DECLINED");

  return (
    <div data-sourcing-event>
      <header className="mt-3 rounded-brand border border-line bg-white p-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Sourcing Event</p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[24px] font-extrabold">{ev.number}</h1>
          <span className="rounded-full border border-ink px-3 py-0.5 text-[12.5px] font-bold" data-event-status>{STATUS[ev.status]}</span>
        </div>
        <p className="text-[14.5px] font-semibold"><Link href={`/work-requests/${ev.jobId}`} className="hover:underline">{ev.job.title}</Link></p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-ink-2">
          <span>Deadline {new Date(ev.deadlineAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · <b className="text-magenta-dark"><Countdown at={ev.deadlineAt} /></b></span>
          <span data-event-counts>{ev.counts.requested} requested · {ev.counts.proposed} proposed · {ev.counts.declined} declined</span>
          {range && <span>Your range {range}</span>}
        </p>
        {!awarded && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold">Extend the deadline by</span>
            <input inputMode="numeric" value={extendBy} onChange={(e) => setExtendBy(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-label="Hours to extend" className="w-14 rounded-[8px] border border-line px-2 py-1.5 text-right" />
            <span>hours</span>
            <button type="button" className={GHOST} disabled={busy || !Number(extendBy)} onClick={() => act("/api/sourcing", { action: "extend", eventId: ev.id, hours: Number(extendBy) }, "Deadline extended.")} data-extend>Extend</button>
          </div>
        )}
      </header>

      {ev.notifyOthers && (
        <section className="mt-5 rounded-brand border border-magenta-dark bg-[#fbeafb]/40 p-5" data-notify-others>
          <h2 className="text-[16px] font-extrabold">Let the Other Candidates Know</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">The Work Order is Released. This goes to the {ev.notifyOthers.count} provider{ev.notifyOthers.count === 1 ? "" : "s"} you didn&apos;t award (bell + email).</p>
          <textarea value={notice} onChange={(e) => setNotice(e.target.value)} rows={4} maxLength={2000} aria-label="Message to the other candidates" className="mt-2 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14px]" />
          <button type="button" className={`${BTN} mt-3`} disabled={busy || !notice.trim()} onClick={() => act("/api/sourcing", { action: "notifyOthers", eventId: ev.id, note: notice }, "Sent — the Sourcing Event is closed.")} data-send-not-awarded>Send</button>
        </section>
      )}
      {ev.othersNotifiedAt && <p className="mt-4 text-[13.5px] text-ink-2">The other candidates were told on {new Date(ev.othersNotifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.</p>}

      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-extrabold">Proposals</h2>
          <button type="button" className={GHOST} disabled={picked.size < 2 || picked.size > 4} onClick={() => setComparing(true)} data-compare-proposals title="Tick 2 to 4 proposals">Compare{picked.size >= 2 ? ` ${picked.size}` : ""}</button>
        </div>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {ev.proposals.map((p) => {
            const pr = p.proposal;
            const over = pr?.rateCents != null && ev.job.budget_max_cents != null && pr.rateCents > ev.job.budget_max_cents;
            return (
              <li key={p.personId} className="flex flex-wrap items-start gap-3 py-3" data-event-proposal={p.match.name}>
                {pr && pr.status !== "DECLINED" ? <input type="checkbox" checked={picked.has(p.personId)} onChange={() => toggle(p.personId)} aria-label={`Compare ${p.match.name}`} className="mt-1 h-4 w-4" /> : <span className="w-4" />}
                {isMaskedName(p.match.name) && <NeutralAvatar size={36} />}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{p.match.name}{pr?.status === "SHORTLISTED" && <span className="ml-2 text-magenta-dark">★</span>}{pr?.status === "AWARDED" && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[11px] text-surface">Awarded</span>}</p>
                  <p className="text-[13px] text-ink-2">{p.match.line}</p>
                  {pr ? (
                    <p className="mt-1 text-[13.5px]"><b className={over ? "text-magenta-dark" : ""}>{usd(pr.rateCents)}{per}</b>{range && <span className="text-ink-2"> vs {range}</span>}{pr.start && <span className="text-ink-2"> · earliest start {pr.start}</span>}{pr.status === "DECLINED" && <span className="text-ink-3"> · you declined</span>}</p>
                  ) : (
                    <p className="mt-1 text-[13.5px] text-ink-3">{p.requestStatus === "DECLINED" ? `Declined${p.declineReason ? ` — “${p.declineReason}”` : ""}` : "No proposal yet"}</p>
                  )}
                  {pr?.note && <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{pr.note}</p>}
                  <p className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]">
                    {p.match.why.map((k) => <span key={k} className="rounded-full border border-magenta-dark bg-[#fbeafb] px-2 font-semibold text-magenta-dark">{k}</span>)}
                    {p.match.matched.map((k) => <span key={k} className="rounded-full border border-line bg-bg-soft px-2">{k}</span>)}
                  </p>
                </div>
                {pr && pr.status !== "DECLINED" && !awarded && (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button type="button" className={GHOST} disabled={busy} onClick={() => act("/api/sourcing", { action: pr.status === "SHORTLISTED" ? "unshortlist" : "shortlist", eventId: ev.id, proposalId: pr.id })}>{pr.status === "SHORTLISTED" ? "★ Shortlisted" : "☆ Shortlist"}</button>
                    <button type="button" className={GHOST} disabled={busy} onClick={() => act(`/api/work-requests/${ev.jobId}/interview`, { providerPersonId: p.personId }, "Interview requested — they'll offer times.")} data-request-interview>Request Interview</button>
                    <button type="button" className={GHOST} disabled={busy || !ev.certificationTestId} title={ev.certificationTestId ? undefined : "No certification test exists for this job's skills yet"} onClick={() => act(`/api/work-requests/${ev.jobId}/test`, { providerPersonId: p.personId, learnAssessmentId: ev.certificationTestId }, "Certification test sent.")} data-request-test>Request Certification Test</button>
                    <button type="button" className={GHOST} disabled={busy} onClick={() => act("/api/sourcing", { action: "declineProposal", eventId: ev.id, proposalId: pr.id })}>Decline</button>
                    <Link href={`/hire/terms?job=${ev.jobId}&provider=${p.personId}`} className={BTN} data-award>Award</Link>
                  </div>
                )}
              </li>
            );
          })}
          {!ev.proposals.length && <li className="py-4 text-[13.5px] text-ink-3">No requests in this event.</li>}
        </ul>
        {msg && <p role="status" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{msg}</p>}
        {ev.workOrderId && <p className="mt-3 text-[13.5px]">Work Order: <Link href={`/orders/${ev.workOrderId}`} className="font-semibold text-magenta-dark underline underline-offset-4">open it</Link></p>}
      </section>
      {comparing && <CompareTable rows={withProposal.filter((p) => picked.has(p.personId)).map((p) => ({ m: p.match, proposed: p.proposal?.rateCents != null ? `${usd(p.proposal.rateCents)}${per}` : null, start: p.proposal?.start ?? null }))} onClose={() => setComparing(false)} />}
    </div>
  );
}
