"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BTN, BTN_OUT, LABEL } from "@/components/hire/HireUI";
import { OpenTimes } from "@/components/hire/OpenTimes";
import type { OpenWindow } from "@/lib/open-times";

// IW-E004: one row or many — pick the length, see your Open Times, Send Interview Invitations (each provider books a slot).
const LENGTHS = [15, 30, 45, 60];

export function InterviewDialog({ jobId, providerPersonIds, providerLabels = [], onClose, onSent }: { jobId: string; providerPersonIds: string[]; providerLabels?: string[]; onClose: () => void; onSent?: (msg: string) => void }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(30);
  const [preview, setPreview] = useState<{ windows: OpenWindow[]; free: number; next: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const call = (body: object) => fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const load = useCallback(async () => {
    const r = await call({ action: "preview", minutes });
    if (r?.ok) setPreview(await r.json());
  }, [minutes]);
  useEffect(() => { void load(); }, [load]);
  const send = async () => {
    setBusy(true); setError(null);
    const r = await call({ action: "invite", jobId, providerPersonIds, minutes });
    const j = (await r?.json().catch(() => ({}))) as { error?: string; sent?: number; skipped?: number };
    setBusy(false);
    if (!r?.ok) { setError(j.error ?? "Couldn't send — try again."); return; }
    onSent?.(`Sent ${j.sent ?? 0} interview invitation${j.sent === 1 ? "" : "s"}${j.skipped ? ` · ${j.skipped} already invited or not responded` : ""}.`);
    router.refresh();
    onClose();
  };
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; } })();
  const n = providerPersonIds.length;
  return (
    <div role="dialog" aria-label="Interview" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose} data-interview-dialog>
      <div className="mt-10 w-full max-w-2xl rounded-[12px] bg-white p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold">Interview {providerLabels.length === 1 ? providerLabels[0] : n === 1 ? "1 Provider" : `${n} Providers`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-state-inactive hover:text-ink">×</button>
        </div>
        {providerLabels.length > 1 && <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px]" data-interview-to><b>To:</b>{providerLabels.map((l) => <span key={l} className="rounded-full border border-state-border px-2 py-0.5 font-semibold">{l}</span>)}</p>}
        <p className={`${LABEL} mt-4`}>Interview Length</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {LENGTHS.map((m) => <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)} className={minutes === m ? "rounded-full border border-ink bg-ink px-3.5 py-1.5 text-[13px] font-bold text-surface" : "rounded-full border border-state-border bg-white px-3.5 py-1.5 text-[13px] font-semibold"}>{m} min</button>)}
        </div>
        <p className="mt-3 text-[13px] text-state-inactive">Video (Daily) · a 5-minute gap between interviews</p>
        <div className="mt-4 border-t border-state-border pt-3" data-dialog-open-times>
          <p className="text-[14px] font-bold">Your Open Times: {preview ? `${preview.windows.length} window${preview.windows.length === 1 ? "" : "s"} → ${preview.free} free slot${preview.free === 1 ? "" : "s"}` : "…"}</p>
          {preview && preview.next.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5" data-next-slots>
              {Object.entries(preview.next.reduce<Record<string, string[]>>((g, iso) => { const d = new Date(iso).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }); (g[d] ??= []).push(new Date(iso).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" })); return g; }, {})).map(([d, times]) => (
                <div key={d} className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                  <span className="w-[92px] shrink-0 font-semibold text-ink-2">{d}</span>
                  {times.map((t) => <span key={t} className="rounded-full border border-state-border px-2 py-0.5 text-ink">{t}</span>)}
                </div>
              ))}
            </div>
          )}
          {preview && <div className="mt-2"><OpenTimes compact windows={preview.windows} onChanged={() => void load()} /></div>}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-state-declined">{error}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_OUT}>Cancel</button>
          <button type="button" disabled={busy || !preview?.free} title={preview?.free ? undefined : "Add an Open Time first"} onClick={send} className={`${BTN} disabled:opacity-40`} data-send-invitations>Send Interview Invitation{n === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  );
}
