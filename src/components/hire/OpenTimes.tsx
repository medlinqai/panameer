"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";
import type { OpenWindow } from "@/lib/open-times";

// IW-E002: My Open Times — the buyer's windows (one calendar for every job); providers book interviews inside them.
const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border bg-white px-3 py-2 text-[14px]";
const tzNow = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; } };
const day = (iso: string, tz: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
const time = (iso: string, tz: string) => new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });

export function OpenTimes({ windows, compact = false, onChanged }: { windows: OpenWindow[]; compact?: boolean; onChanged?: () => void }) {
  const router = useRouter();
  const tz = tzNow();
  const [date, setDate] = useState(() => new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA"));
  const [from, setFrom] = useState("13:00");
  const [to, setTo] = useState("17:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async (body: object) => {
    setBusy(true); setError(null);
    const r = await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't save — try again."); return false; }
    router.refresh();
    onChanged?.();
    return true;
  };
  return (
    <section className={compact ? "" : "rounded-[12px] border border-state-border bg-white px-5 py-4"} data-open-times>
      {!compact && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-extrabold">My Open Times</h2>
          <span className="text-[12.5px] text-state-inactive">Providers book interviews inside these windows · {tz}</span>
        </div>
      )}
      {windows.length ? (
        <ul className="mt-3 divide-y divide-state-sunken border-y border-state-sunken">
          {windows.map((w) => (
            <li key={w.id} className="flex flex-wrap items-start gap-3 py-2.5" data-open-time>
              <div className="min-w-0 flex-1">
                <b className="text-[14px]">{day(w.startsAt, tz)} · {time(w.startsAt, tz)} – {time(w.endsAt, tz)}</b>
                {w.booked.length ? (
                  <ul className="mt-1 text-[13px]">{w.booked.map((b) => <li key={b.id} className="flex flex-wrap items-center gap-x-2"><span className="font-semibold text-state-accepted">{time(b.startsAt, tz)}</span> · {b.who} · <span className="text-state-inactive">{b.jobTitle}</span><button type="button" disabled={busy} onClick={() => post({ action: "cancel", as: "buyer", interviewId: b.id })} className="text-[12.5px] font-semibold text-state-declined underline underline-offset-2" data-cancel-booked>Cancel</button></li>)}</ul>
                ) : <p className="mt-0.5 text-[13px] text-state-inactive">Nothing booked yet</p>}
              </div>
              {!w.booked.length && <button type="button" disabled={busy} onClick={() => post({ action: "openTimeRemove", openTimeId: w.id })} className={`${BTN_OUT} min-h-9`}>Remove</button>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-[13.5px] text-state-inactive">No Open Times yet. Add a window and invited providers book a slot inside it.</p>}
      <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-3" data-add-open-time>
        <label className={LABEL}>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>From<input type="time" step={300} value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} /></label>
        <label className={LABEL}>To<input type="time" step={300} value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} /></label>
        <button type="button" disabled={busy} onClick={() => post({ action: "openTimeAdd", date, from, to, timeZone: tz })} className={`${BTN} col-span-2 justify-self-start sm:col-span-3`}>Add Open Time</button>
      </div>
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </section>
  );
}

/** IW-E006: invitations sent from Open Times that no one has booked yet. */
export function InvitedNotBooked({ rows }: { rows: { id: string; who: string; jobTitle: string; jobId: string; sent: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cancel = async (id: string) => {
    setBusy(true);
    await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", as: "buyer", interviewId: id }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  if (!rows.length) return null;
  return (
    <section className="rounded-[12px] border border-state-border bg-white px-5 py-4" data-invited-not-booked>
      <h2 className="text-[17px] font-extrabold">Invited, Not Booked <span className="text-[14px] font-semibold text-state-pending">{rows.length}</span></h2>
      <ul className="mt-2 divide-y divide-state-sunken">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-2 text-[13.5px]">
            <span className="h-2.5 w-2.5 rounded-full bg-state-pending" />
            <b>{r.who}</b><a href={`/work-requests/${r.jobId}#interviews`} className="min-w-0 flex-1 truncate text-state-inactive">{r.jobTitle}</a>
            <span className="text-state-inactive">Invited {r.sent}</span>
            <button type="button" disabled={busy} onClick={() => cancel(r.id)} className={`${BTN_OUT} min-h-8 px-2.5 text-[12.5px]`}>Cancel</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
