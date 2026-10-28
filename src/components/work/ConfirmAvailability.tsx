"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Countdown, DeadlineTag } from "@/components/hire/Countdown";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

// CA-E002/E006: one click — the job fixes the dates, the rate card fills the rate. Same card for "asked" (an Availability
// Request with a deadline) and "open" (a posted job), so providers learn one button: I Want This Job.
export type AvailabilityView = {
  mode: "asked" | "open";
  dates: { start: string | null; end: string | null };
  range: { type: string; minCents: number | null; maxCents: number | null };
  rateCardCents: number | null;
  responded: { rateCents: number | null; note: string | null } | null;
  declined?: boolean; declineReason?: string | null;
  open: boolean;
  deadlineAt?: string; eventNumber?: string;
  /** Shortlist context for the provider: how many were asked, how many positions. */
  askedCount?: number; positions?: number;
};
const FIELD = "mt-1 block w-full rounded-[8px] border border-line bg-white px-3 py-2.5 text-[14.5px] font-normal text-ink";
const usd = (c: number | null | undefined) => (c == null ? null : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const day = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export function ConfirmAvailability({ jobId, v, startDeclining = false }: { jobId: string; v: AvailabilityView; startDeclining?: boolean }) {
  const router = useRouter();
  const noCard = v.rateCardCents == null;
  const [changing, setChanging] = useState(noCard);
  const [rate, setRate] = useState((((v.responded?.rateCents ?? v.rateCardCents) ?? 0) / 100 || "").toString());
  const [note, setNote] = useState(v.responded?.note ?? "");
  const [declining, setDeclining] = useState(startDeclining && v.mode === "asked");
  const [reason, setReason] = useState("");
  const [sending, setBusy] = useState(false);
  // Scott 10-22: stay busy (spinner) until the refreshed page lands, so nobody clicks twice thinking it stalled.
  const [refreshing, startRefresh] = useTransition();
  const busy = sending || refreshing;
  const [error, setError] = useState<string | null>(null);
  const per = v.range.type === "FIXED" ? "" : "/hr";
  const range = v.range.minCents != null || v.range.maxCents != null ? `${usd(v.range.minCents) ?? "…"} – ${usd(v.range.maxCents) ?? "…"}${per}` : "Not given";
  const cents = changing ? Math.round(Number(rate) * 100) : v.responded?.rateCents ?? v.rateCardCents ?? 0;

  const post = async (url: string, body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    startRefresh(() => router.refresh());
  };
  const want = () => {
    if (!(cents > 0)) { setError("Enter your rate for this job."); return; }
    const n = changing ? note.trim() || null : v.responded?.note ?? null;
    return v.mode === "asked"
      ? post("/api/sourcing", { jobId, action: "propose", rateCents: cents, start: v.dates.start, note: n })
      : post(`/api/work-requests/${jobId}/propose`, { coverNote: n, rate: { unitPriceCents: cents, basis: per ? "RATE" : "AMOUNT" } });
  };

  return (
    <section className="rounded-brand border border-line bg-white p-5" data-confirm-availability={v.mode}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-extrabold">{v.mode === "asked" ? `Availability Request${v.eventNumber ? ` · ${v.eventNumber}` : ""}` : "Want This Job?"}</h2>
        {v.mode === "asked" && v.deadlineAt && v.open && (v.responded || v.declined) && <span className="text-[13.5px]"><Countdown at={v.deadlineAt} /></span>}
      </div>
      {v.mode === "asked" && v.open && !v.responded && !v.declined && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[12.5px] font-bold" data-shortlist-context>
          <span className="rounded-full bg-state-accepted-bg px-2.5 py-1 text-state-accepted">You&apos;re Shortlisted</span>
          <span className="rounded-full bg-state-sunken px-2.5 py-1 text-ink-2">{v.positions ?? 1} Position{(v.positions ?? 1) === 1 ? "" : "s"}</span>
          {v.askedCount && v.askedCount > 1 ? <span className="rounded-full bg-state-pending-bg px-2.5 py-1 text-state-pending">{v.askedCount - 1} Other{v.askedCount - 1 === 1 ? "" : "s"} Asked</span> : null}
          {v.deadlineAt && <DeadlineTag at={v.deadlineAt} prefix="Reply in" />}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-3">
        <div><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">Dates</dt><dd className="mt-0.5 font-semibold" data-job-dates>{v.dates.start || v.dates.end ? `${day(v.dates.start)} – ${day(v.dates.end)}` : "Not Set by the Buyer"}</dd></div>
        <div><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">Buyer&apos;s Rate Range</dt><dd className="mt-0.5 font-semibold" data-buyer-range>{range}</dd></div>
        <div><dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-state-inactive">Your Rate</dt><dd className="mt-0.5 font-semibold" data-your-rate>{v.responded?.rateCents != null ? `${usd(v.responded.rateCents)}${per}` : noCard ? "Not on your rate card" : `${usd(v.rateCardCents)}${per} (from your rate card)`}</dd></div>
      </dl>

      {!v.open ? (
        <p className="mt-4 rounded-[8px] bg-bg-soft px-3 py-2.5 text-[14px] font-semibold" data-availability-closed>Closed{v.responded ? ` — you said you're available at ${usd(v.responded.rateCents)}${per}.` : v.declined ? " — you said Not This Time." : "."}</p>
      ) : declining ? (
        <div className="mt-4">
          <label className="block text-[13px] font-bold">Reason (Optional — the Buyer Sees It)<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className={FIELD} placeholder="Booked those dates, rate too low…" /></label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => post("/api/sourcing", { jobId, action: "decline", reason })} className={BTN}>{busy ? <><Spin />Sending…</> : "Send Not This Time"}</button>
            <button type="button" onClick={() => setDeclining(false)} className={BTN_OUT}>Back</button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          {v.responded && <p className="mb-2 text-[13.5px] font-semibold text-state-accepted" data-availability-sent>{v.mode === "asked" ? "You said you're available — you can change your rate until the deadline" : "You said you want this job"}.</p>}
          {v.declined && <p className="mb-2 text-[13.5px] text-ink-2">You said Not This Time{v.declineReason ? ` (“${v.declineReason}”)` : ""}. You can still say you want it.</p>}
          {changing && (
            <div className="mb-3 grid gap-x-3 sm:grid-cols-2" data-change-rate>
              <label className="block text-[13px] font-bold">Your Rate for This Job ($){per && " per Hour"}<input inputMode="decimal" required={noCard} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} className={FIELD} data-availability-rate /></label>
              <label className="block text-[13px] font-bold">Note (Optional)<input value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className={FIELD} /></label>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {(!v.responded || changing) && <button type="button" disabled={busy || !(cents > 0)} onClick={want} className={BTN} data-want-this-job>{busy ? <><Spin />Sending…</> : v.responded ? "Update My Rate" : v.mode === "asked" ? "I'm Available" : "I Want This Job"}</button>}
            {v.mode === "asked" && !v.responded && !v.declined && <button type="button" onClick={() => setDeclining(true)} className={BTN_OUT} data-not-this-time>Not This Time</button>}
            {!changing && <button type="button" onClick={() => setChanging(true)} className="ml-1 text-[13px] font-semibold text-ink-2 underline underline-offset-4" data-change-my-rate>Change My Rate for This Job</button>}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-state-declined">{error}</p>}
    </section>
  );
}

function Spin() {
  return <span aria-hidden className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}
