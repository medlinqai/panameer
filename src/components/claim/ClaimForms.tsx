"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD = "mt-1 block w-full rounded-[8px] border border-state-border px-3 py-2 text-[14px]";
const BTN = "inline-flex min-h-10 items-center bg-magenta px-5 text-[14px] font-bold text-white hover:bg-magenta-dark disabled:opacity-40";

// EX-E005 step 1 — confirm you're the company: a link to your work email.
export function ClaimStart({ token, domainHint }: { token: string; domainHint: string | null }) {
  const [f, setF] = useState({ email: "", name: "", role: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form className="space-y-3" data-claim-start onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      const r = await fetch("/api/claim/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...f }) }).catch(() => null);
      const j = (await r?.json().catch(() => ({}))) as { error?: string; needsAdmin?: boolean };
      setBusy(false);
      setMsg(r?.ok ? `Check ${f.email} for a link to continue.${j.needsAdmin ? " We'll also confirm the email belongs to the company." : ""}` : j.error ?? "That didn't work.");
    }}>
      <label className="block text-[13px] font-semibold">Work Email{domainHint ? ` (must be @${domainHint})` : ""}<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={FIELD} /></label>
      <label className="block text-[13px] font-semibold">Your Name<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={FIELD} /></label>
      <label className="block text-[13px] font-semibold">Role<input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={FIELD} placeholder="Talent Acquisition Lead" /></label>
      <button type="submit" disabled={busy} className={BTN}>Send Me a Link</button>
      {msg && <p role="status" className="text-[13.5px] font-semibold">{msg}</p>}
    </form>
  );
}

// EX-E005 steps 2–3 — check the job (pre-filled from the listing), then publish free.
export function ClaimPublish({ token, initial }: { token: string; initial: { title: string; description: string; location: string; workType: string } }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className="space-y-3" data-claim-publish onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const r = await fetch("/api/claim/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...f }) }).catch(() => null);
      const j = (await r?.json().catch(() => ({}))) as { error?: string; jobId?: string };
      setBusy(false);
      if (!r?.ok || !j.jobId) { setErr(j.error ?? "Couldn't publish."); return; }
      router.push(`/work-requests/${j.jobId}`);
    }}>
      <label className="block text-[13px] font-semibold">Title<input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={FIELD} /></label>
      <label className="block text-[13px] font-semibold">Description<textarea rows={8} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={FIELD} placeholder="What the work is, how long, and what you need" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-semibold">Location<input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={FIELD} /></label>
        <label className="block text-[13px] font-semibold">Where<select value={f.workType} onChange={(e) => setF({ ...f, workType: e.target.value })} className={FIELD}><option value="">—</option><option>Remote</option><option>Hybrid</option><option>Onsite</option></select></label>
      </div>
      <button type="submit" disabled={busy} className={BTN} data-claim-publish-button>Publish Free</button>
      {err && <p role="alert" className="text-[13.5px] font-semibold text-state-declined">{err}</p>}
    </form>
  );
}
