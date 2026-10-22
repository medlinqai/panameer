"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT } from "@/components/hire/HireUI";

// IW-E005: the provider books one of the buyer's Open Times — free slots in the provider's own time zone, grouped by day.
export function BookInterview({ interviewId, company, jobTitle, minutes, slots, booked }: { interviewId: string; company: string; jobTitle: string; minutes: number; slots: string[]; booked: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; } })();
  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    const r = await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); router.refresh(); return; }
    router.refresh();
  };
  const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" });
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const days = [...new Set(slots.map(dayOf))];
  return (
    <section className="rounded-brand border border-line bg-white p-5" data-book-interview>
      <h3 className="text-[16px] font-extrabold">{company} Wants to Interview You</h3>
      <p className="mt-0.5 text-[13.5px] text-ink-2">{jobTitle} · {minutes} min · Video · times in {tz}</p>
      {booked ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-[14px] font-semibold text-state-accepted" data-interview-booked>Booked · {dayOf(booked)}, {timeOf(booked)}</p>
          <button type="button" disabled={!!busy} onClick={() => post({ action: "cancel", as: "provider", interviewId }, "cancel")} className={`${BTN_OUT} min-h-9`} data-cancel-interview>Cancel</button>
        </div>
      ) : slots.length ? (
        <div className="mt-3 flex flex-col gap-3">
          {days.map((d) => (
            <div key={d}>
              <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-state-inactive">{d}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {slots.filter((s) => dayOf(s) === d).map((s) => (
                  <button key={s} type="button" disabled={!!busy} onClick={() => post({ action: "book", interviewId, startsAt: s, timeZone: tz }, s)} className={busy === s ? BTN : BTN_OUT} title="Book This Time" data-slot={s}>{timeOf(s)}</button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[12.5px] text-state-inactive">Pick a time to Book This Time — it&apos;s yours at once.</p>
        </div>
      ) : <p className="mt-3 text-[14px] text-state-inactive">No open times left right now. The buyer will add more — check back soon.</p>}
      {error && <p role="alert" className="mt-3 text-[13.5px] font-semibold text-state-declined">{error}</p>}
    </section>
  );
}
