"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { InterviewRow } from "@/lib/interviews";
import { INTERVIEW_GUIDELINES } from "@/lib/interview-guidelines";
import { NeutralAvatar } from "@/components/Avatar";

// DB-E008–E010: Schedule Interview for both sides — the provider offers times, the buyer confirms one,
// Join opens a Panameer video room. The buyer sees the provider number only.
const GHOST = "inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3.5 text-[13px] font-semibold text-ink hover:bg-bg-soft disabled:opacity-40";
const BTN = "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const STATUS: Record<string, string> = { REQUESTED: "Waiting for times", SLOTS_OFFERED: "Times offered", SCHEDULED: "Scheduled", COMPLETED: "Completed", DECLINED: "Declined", CANCELLED: "Cancelled" };
const fmt = (iso: string, tz?: string) => new Date(iso).toLocaleString("en-US", { ...(tz ? { timeZone: tz } : {}), weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export function InterviewGuidelines() {
  return <p data-interview-guidelines className="rounded-[8px] border border-line bg-bg-soft px-3 py-2.5 text-[12.5px] leading-snug text-ink-2"><b className="text-ink">Interview guidelines:</b> {INTERVIEW_GUIDELINES}</p>;
}

export function InterviewCards({ rows, side, videoReady, guidelines = true }: { rows: InterviewRow[]; side: "buyer" | "provider"; videoReady: boolean; guidelines?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [times, setTimes] = useState<Record<string, string[]>>({});
  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "That didn't work."); return; }
    router.refresh();
  };
  if (!rows.length) return null;
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York";
  return (
    <div className="grid gap-3" data-interview-cards>
      {guidelines && <InterviewGuidelines />}
      {rows.map((r) => {
        const t = times[r.id] ?? ["", "", ""];
        return (
          <article key={r.id} className="rounded-[10px] border border-line bg-white p-4" data-interview={r.status}>
            <div className="flex flex-wrap items-center gap-3">
              {side === "buyer" && <NeutralAvatar size={32} photoUrl={r.providerPhotoUrl} />}
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold">{side === "buyer" ? r.providerLabel : r.buyerCompany} · <Link href={side === "buyer" ? `/work-requests/${r.jobId}` : `/work/jobs/${r.jobId}`} className="hover:underline">{r.jobTitle}</Link></p>
                <p className="text-[12.5px] text-ink-2">{r.number} · {r.minutes} min · {STATUS[r.status] ?? r.status}{r.startsAt ? ` · ${fmt(r.startsAt)}` : ""}</p>
              </div>
            </div>

            {r.status === "REQUESTED" && side === "provider" && (
              <div className="mt-3">
                <p className="text-[13px] font-semibold">Offer up to three times</p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                  {t.map((v, i) => <input key={i} type="datetime-local" value={v} aria-label={`Time ${i + 1}`} onChange={(e) => setTimes((m) => ({ ...m, [r.id]: t.map((x, k) => (k === i ? e.target.value : x)) }))} className="rounded-[8px] border border-line px-2.5 py-2 text-[13.5px]" />)}
                </div>
                <button type="button" className={`${BTN} mt-2`} disabled={busy || !t.some(Boolean)} onClick={() => post({ action: "offer", interviewId: r.id, slots: t.filter(Boolean).map((v) => ({ startsAt: new Date(v).toISOString(), timeZone: tz })) })} data-offer-times>Offer Times</button>
              </div>
            )}
            {r.status === "REQUESTED" && side === "buyer" && <p className="mt-2 text-[13px] text-ink-2">Waiting for {r.providerLabel} to offer times.</p>}

            {r.status === "SLOTS_OFFERED" && side === "buyer" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.slots.map((s) => <button key={s.id} type="button" className={GHOST} disabled={busy} onClick={() => post({ action: "confirm", interviewId: r.id, lineId: s.id })} data-confirm-slot>Confirm {fmt(s.startsAt)}</button>)}
              </div>
            )}
            {r.status === "SLOTS_OFFERED" && side === "provider" && <p className="mt-2 text-[13px] text-ink-2">You offered {r.slots.map((s) => fmt(s.startsAt, s.timeZone)).join(" · ")} — waiting for the buyer to pick one.</p>}

            {r.status === "SCHEDULED" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.hasRoom ? <a href={`/api/interviews/${r.id}/join`} target="_blank" rel="noreferrer" className={BTN} data-join>Join</a> : <span className="text-[13px] text-ink-3" data-no-video>{videoReady ? "Video room is being set up" : "Video link not set up yet"}</span>}
                <a href={`/api/interviews/${r.id}/ics`} className={GHOST}>Add to Calendar</a>
                {side === "buyer" && <button type="button" className={GHOST} disabled={busy} onClick={() => post({ action: "complete", interviewId: r.id })}>Mark Done</button>}
              </div>
            )}
          </article>
        );
      })}
      {error && <p role="alert" className="text-[13.5px] font-semibold text-magenta-dark">{error}</p>}
    </div>
  );
}
