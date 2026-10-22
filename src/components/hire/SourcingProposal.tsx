"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/hire/Countdown";

// SE-E004: the provider's proposal in a Sourcing Event — the buyer's rate range, a countdown, Submit Proposal or Decline.
type View = {
  eventNumber: string; deadlineAt: string; hours: number; open: boolean; declined: boolean; declineReason: string | null;
  proposed: { rateCents: number | null; start: string | null; note: string | null } | null;
  range: { type: string; minCents: number | null; maxCents: number | null }; rateCardCents: number | null;
};
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const LABEL = "mt-3 block text-[13px] font-bold";
const usd = (c: number | null) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);

export function SourcingProposal({ jobId, v, startDeclining = false }: { jobId: string; v: View; startDeclining?: boolean }) {
  const router = useRouter();
  const [rate, setRate] = useState(((v.proposed?.rateCents ?? v.rateCardCents ?? 0) / 100 || "").toString());
  const [start, setStart] = useState(v.proposed?.start ?? "");
  const [note, setNote] = useState(v.proposed?.note ?? "");
  const [declining, setDeclining] = useState(startDeclining);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const per = v.range.type === "FIXED" ? "" : "/hr";
  const range = v.range.minCents != null || v.range.maxCents != null ? `${usd(v.range.minCents) ?? "…"} – ${usd(v.range.maxCents) ?? "…"}${per}` : "Not given";

  const send = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/sourcing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, ...body }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    router.refresh();
  };

  return (
    <section className="rounded-brand border border-line bg-white p-5" data-sourcing-proposal>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-extrabold">Request to Propose · {v.eventNumber}</h2>
        <span className="text-[13.5px] font-bold text-magenta-dark"><Countdown at={v.deadlineAt} /></span>
      </div>
      <p className="mt-1 text-[13px] text-ink-2">Due {new Date(v.deadlineAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ({v.hours} hours)</p>
      <p className="mt-3 text-[14px]"><span className="text-ink-2">Buyer&apos;s rate range:</span> <b data-buyer-range>{range}</b></p>

      {!v.open ? (
        <p className="mt-4 rounded-[8px] bg-bg-soft px-3 py-2.5 text-[14px] font-semibold" data-sourcing-closed>Closed{v.proposed ? ` — you proposed ${usd(v.proposed.rateCents)}${per}.` : v.declined ? " — you declined." : "."}</p>
      ) : v.declined ? (
        <p className="mt-4 text-[14px]">You declined{v.declineReason ? ` (“${v.declineReason}”)` : ""}. <button type="button" className="font-semibold text-magenta-dark underline underline-offset-4" onClick={() => send({ action: "propose", rateCents: Math.round(Number(rate) * 100), start, note })} disabled={busy || !Number(rate)}>Propose instead</button></p>
      ) : declining ? (
        <div className="mt-4">
          <label className={LABEL}>Why are you declining?<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className={FIELD} placeholder="Not available, rate too low…" /></label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => send({ action: "decline", reason })} className="inline-flex min-h-10 items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50">Decline</button>
            <button type="button" onClick={() => setDeclining(false)} className="inline-flex min-h-10 items-center border border-ink px-4 text-[14px] font-semibold">Back</button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          {v.proposed && <p className="mt-2 text-[13.5px] font-semibold text-ink-2">Your proposal is in — you can change it until the deadline.</p>}
          <div className="grid gap-x-3 sm:grid-cols-2">
            <label className={LABEL}>Your rate ($){per && " per hour"}<input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} className={FIELD} data-proposal-rate /></label>
            <label className={LABEL}>Earliest start<input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} /></label>
          </div>
          <label className={LABEL}>Note<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} className={FIELD} /></label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy || !Number(rate)} onClick={() => send({ action: "propose", rateCents: Math.round(Number(rate) * 100), start: start || null, note: note || null })} className="inline-flex min-h-10 items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50" data-submit-proposal>{v.proposed ? "Update Proposal" : "Submit Proposal"}</button>
            {!v.proposed && <button type="button" onClick={() => setDeclining(true)} className="inline-flex min-h-10 items-center border border-ink px-4 text-[14px] font-semibold" data-decline-request>Decline</button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
    </section>
  );
}
