"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = ["No time", "Didn't understand", "Not a fit", "Company/approval issue", "Testing", "Other"];

// SO-E009: Send Personal Email (prefilled) and Why they stopped (reason + note) on Admin › Users › {user}.
export function RegistrationFollowup({ personId, firstName, step, reason, note, emails }: { personId: string; firstName: string; step: string; reason: string | null; note: string | null; emails: number }) {
  const router = useRouter();
  const [subject, setSubject] = useState("Can I help you finish signing up?");
  const [body, setBody] = useState(`Hi ${firstName || "there"},\n\nI saw you started signing up for Panameer and stopped at ${step}. Is anything getting in the way? Reply to this email and I'll help.\n\nThanks,`);
  const [r, setR] = useState(reason ?? "");
  const [n, setN] = useState(note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const post = async (data: object, ok: string) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/users/${personId}/followup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).catch(() => null);
    setBusy(false);
    setMsg(res?.ok ? ok : "That didn't save.");
    if (res?.ok) router.refresh();
  };
  const INPUT = "mt-1 block w-full border border-line bg-surface px-3 py-2 text-[14px]";
  return (
    <section data-registration-followup className="mt-6 border border-line p-4">
      <h2 className="text-[16px] font-bold">Stopped at {step}</h2>
      <p className="text-[12.5px] text-ink-2">{emails ? `${emails} personal email${emails === 1 ? "" : "s"} sent.` : "No personal email yet."}</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[13px] font-bold">Send Personal Email</p>
          <label className="mt-1 block text-[12.5px] text-ink-2">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} /></label>
          <label className="mt-2 block text-[12.5px] text-ink-2">Message<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} className={INPUT} /></label>
          <button type="button" disabled={busy} onClick={() => post({ action: "email", subject, body }, "Sent — replies come to you.")} className="mt-2 bg-ink px-4 py-2 text-[13.5px] font-bold text-surface disabled:opacity-50">Send Personal Email</button>
        </div>
        <div>
          <p className="text-[13px] font-bold">Why they stopped</p>
          <select value={r} onChange={(e) => setR(e.target.value)} aria-label="Why they stopped" className={INPUT}>
            <option value="">Choose…</option>
            {REASONS.map((x) => <option key={x}>{x}</option>)}
          </select>
          <label className="mt-2 block text-[12.5px] text-ink-2">Note<textarea value={n} onChange={(e) => setN(e.target.value)} rows={3} className={INPUT} /></label>
          <button type="button" disabled={busy || !r} onClick={() => post({ action: "reason", reason: r, note: n }, "Saved.")} className="mt-2 border border-ink px-4 py-2 text-[13.5px] font-bold disabled:opacity-50">Save Reason</button>
        </div>
      </div>
      {msg && <p role="status" className="mt-2 text-[13px] text-ink-2">{msg}</p>}
    </section>
  );
}
